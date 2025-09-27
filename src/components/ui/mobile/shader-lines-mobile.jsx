"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export function ShaderAnimationMobile({ 
  intensity = 0.7, 
  enableTouch = true, 
  maxFPS = 30,
  className = ""
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    isPaused: false,
    lastFrameTime: 0,
    frameInterval: 1000 / maxFPS
  })
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  // Intersection Observer for visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        sceneRef.current.isPaused = !entry.isIntersecting
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Touch interaction handlers
  const handleTouchStart = useCallback((e) => {
    if (!enableTouch) return
    e.preventDefault()
    sceneRef.current.isPaused = !sceneRef.current.isPaused
  }, [enableTouch])

  const handleTouchEnd = useCallback((e) => {
    if (!enableTouch) return
    e.preventDefault()
  }, [enableTouch])

  // WebGL support check
  const supportsWebGL = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Check for small screen first
    const checkSmallScreen = () => {
      const isSmall = window.matchMedia('(max-width: 374px)').matches || 
                     (containerRef.current && containerRef.current.offsetWidth < 200);
      setIsSmallScreen(isSmall);
      return isSmall;
    };

    if (checkSmallScreen()) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Check WebGL support
    if (!supportsWebGL()) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Load Three.js dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r89/three.min.js"
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS()
      }
    }
    script.onerror = () => {
      setHasError(true)
      setIsLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      if (sceneRef.current.renderer) {
        const canvas = sceneRef.current.renderer.domElement;
        if (sceneRef.current.contextLostHandler) {
          canvas.removeEventListener('webglcontextlost', sceneRef.current.contextLostHandler);
        }
        if (sceneRef.current.contextRestoredHandler) {
          canvas.removeEventListener('webglcontextrestored', sceneRef.current.contextRestoredHandler);
        }
        sceneRef.current.renderer.dispose()
      }
      if (sceneRef.current.material) {
        sceneRef.current.material.dispose()
      }
      if (sceneRef.current.geometry) {
        sceneRef.current.geometry.dispose()
      }
      // Guarded removal of resize listener using sceneRef
      if (sceneRef.current.onWindowResize) {
        window.removeEventListener('resize', sceneRef.current.onWindowResize)
        sceneRef.current.onWindowResize = null
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return

    try {
      const THREE = window.THREE
      const container = containerRef.current

      // Clear any existing content
      container.innerHTML = ""

      // Initialize camera
      const camera = new THREE.Camera()
      camera.position.z = 1

      // Initialize scene
      const scene = new THREE.Scene()

      // Create geometry
      const geometry = new THREE.PlaneBufferGeometry(2, 2)

      // Define uniforms with mobile optimizations
      const uniforms = {
        time: { type: "f", value: 1.0 },
        resolution: { type: "v2", value: new THREE.Vector2() },
        intensity: { type: "f", value: intensity },
      }

      // Simplified vertex shader
      const vertexShader = `
        void main() {
          gl_Position = vec4( position, 1.0 );
        }
      `

      // Mobile-optimized fragment shader with reduced complexity
      const fragmentShader = `
        #define TWO_PI 6.2831853072
        #define PI 3.14159265359

        precision mediump float;
        uniform vec2 resolution;
        uniform float time;
        uniform float intensity;
          
        float random (in float x) {
            return fract(sin(x)*1e4);
        }
        float random (vec2 st) {
            return fract(sin(dot(st.xy,
                                 vec2(12.9898,78.233)))*
                43758.5453123);
        }
        
        varying vec2 vUv;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          
          // Reduced mosaic scale for mobile performance
          vec2 fMosaicScal = vec2(2.0, 1.0);
          vec2 vScreenSize = vec2(128,128);
          uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
          uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
          float t = time*0.04+random(uv.x)*0.3;
          float lineWidth = 0.0006;

          vec3 color = vec3(0.0);
          // Reduced iterations for mobile performance (from 5 to 3, from 3 to 2)
          for(int j = 0; j < 2; j++){
            for(int i=0; i < 3; i++){
              color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
            }
          }

          // Apply intensity scaling
          color *= intensity;
          gl_FragColor = vec4(color[2],color[1],color[0],1.0);
        }
      `

      // Create material
      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      })

      // Create mesh and add to scene
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      // Initialize renderer with mobile optimizations
      const renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Disable antialiasing for performance
        alpha: true,
        powerPreference: "low-power" // Use low-power GPU mode
      })
      
      // Cap device pixel ratio for mobile performance
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      renderer.setPixelRatio(pixelRatio)
      
      container.appendChild(renderer.domElement)

      // Handle resize with mobile optimizations
      const onWindowResize = () => {
        const rect = container.getBoundingClientRect()
        const width = Math.min(rect.width, 400) // Cap width for mobile
        const height = Math.min(rect.height, 300) // Cap height for mobile
        
        renderer.setSize(width, height)
        uniforms.resolution.value.x = width * pixelRatio
        uniforms.resolution.value.y = height * pixelRatio
      }

      // Assign resize handler to sceneRef for cleanup
      sceneRef.current.onWindowResize = onWindowResize
      onWindowResize()
      window.addEventListener("resize", onWindowResize, false)

      // Add WebGL context loss handlers
      const canvas = renderer.domElement;
      const handleContextLost = (event) => {
        event.preventDefault();
        console.warn('WebGL context lost, pausing animation');
        sceneRef.current.isPaused = true;
      };
      
      const handleContextRestored = () => {
        console.log('WebGL context restored, reinitializing');
        // Reinitialize the shader
        setTimeout(() => {
          if (containerRef.current && window.THREE) {
            initThreeJS();
          }
        }, 100);
      };

      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

      // Store references
      sceneRef.current = {
        camera,
        scene,
        renderer,
        uniforms,
        material,
        geometry,
        animationId: null,
        isPaused: false,
        lastFrameTime: 0,
        frameInterval: 1000 / maxFPS,
        contextLostHandler: handleContextLost,
        contextRestoredHandler: handleContextRestored,
        onWindowResize: onWindowResize
      }

      // Mobile-optimized animation loop with frame rate limiting
      const animate = (currentTime) => {
        if (sceneRef.current.isPaused || !isVisible) {
          sceneRef.current.animationId = requestAnimationFrame(animate)
          return
        }

        // Frame rate limiting
        if (currentTime - sceneRef.current.lastFrameTime >= sceneRef.current.frameInterval) {
          sceneRef.current.lastFrameTime = currentTime
          uniforms.time.value += 0.03 // Slower animation for mobile
          renderer.render(scene, camera)
        }

        sceneRef.current.animationId = requestAnimationFrame(animate)
      }

      animate()
      setIsLoading(false)
    } catch (error) {
      console.error('WebGL initialization failed:', error)
      setHasError(true)
      setIsLoading(false)
    }
  }

  // Error fallback component
  if (hasError) {
    return (
      <div 
        className={`w-full h-full ${className}`}
        style={{
          background: isSmallScreen 
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))'
            : 'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2))'
        }}
      >
        {isSmallScreen && (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60 text-sm text-center">
              <div className="w-8 h-8 bg-white/20 rounded-full mx-auto mb-2 animate-pulse" />
              <div>Static Mode</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: enableTouch ? 'manipulation' : 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {/* Touch indicator */}
      {enableTouch && (
        <div className="absolute top-2 right-2 text-xs text-white/50 pointer-events-none">
          Tap to pause/resume
        </div>
      )}
    </div>
  )
}

export default ShaderAnimationMobile
