import React from 'react';
import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
	return (
		<div
			className={cn(
				'bg-card relative w-full max-w-xs rounded-xl dark:bg-transparent',
				'p-1.5 shadow-xl backdrop-blur-xl',
				'dark:border-border/80 border border-white/10',
				'bg-black/40 backdrop-blur-xl',
				className,
			)}
			{...props}
		/>
	);
}

function Header({
	className,
	children,
	glassEffect = true,
	...props
}) {
	return (
		<div
			className={cn(
				'bg-muted/80 dark:bg-muted/50 relative mb-4 rounded-xl border border-white/10 p-4',
				'bg-black/20 backdrop-blur-sm',
				className,
			)}
			{...props}
		>
			{/* Top glass gradient */}
			{glassEffect && (
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 h-48 rounded-[inherit]"
					style={{
						background:
							'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0) 100%)',
					}}
				/>
			)}
			{children}
		</div>
	);
}

function Plan({ className, ...props }) {
	return (
		<div
			className={cn('mb-8 flex items-center justify-between', className)}
			{...props}
		/>
	);
}

function Description({ className, ...props }) {
	return (
		<p className={cn('text-muted-foreground text-xs text-white/60', className)} {...props} />
	);
}

function PlanName({ className, ...props }) {
	return (
		<div
			className={cn(
				"text-muted-foreground flex items-center gap-2 text-sm font-medium text-white/80 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function Badge({ className, ...props }) {
	return (
		<span
			className={cn(
				'border-foreground/20 text-foreground/80 rounded-full border border-blue-400/30 px-2 py-0.5 text-xs',
				'bg-blue-500/20 text-blue-400',
				className,
			)}
			{...props}
		/>
	);
}

function Price({ className, ...props }) {
	return (
		<div className={cn('mb-3 flex items-end gap-1', className)} {...props} />
	);
}

function MainPrice({ className, ...props }) {
	return (
		<span
			className={cn('text-3xl font-extrabold tracking-tight text-white', className)}
			{...props}
		/>
	);
}

function Period({ className, ...props }) {
	return (
		<span
			className={cn('text-foreground/80 pb-1 text-sm text-white/60', className)}
			{...props}
		/>
	);
}

function OriginalPrice({ className, ...props }) {
	return (
		<span
			className={cn(
				'text-muted-foreground mr-1 ml-auto text-lg line-through text-white/40',
				className,
			)}
			{...props}
		/>
	);
}

function Body({ className, ...props }) {
	return <div className={cn('space-y-6 p-3', className)} {...props} />;
}

function List({ className, ...props }) {
	return <ul className={cn('space-y-3', className)} {...props} />;
}

function ListItem({ className, ...props }) {
	return (
		<li
			className={cn(
				'text-muted-foreground flex items-start gap-3 text-sm text-white/70',
				className,
			)}
			{...props}
		/>
	);
}

function Separator({
	children = 'Upgrade to access',
	className,
	...props
}) {
	return (
		<div
			className={cn(
				'text-muted-foreground flex items-center gap-3 text-sm text-white/60',
				className,
			)}
			{...props}
		>
			<span className="bg-muted-foreground/40 h-[1px] flex-1 bg-white/20" />
			<span className="text-muted-foreground shrink-0 text-white/60">{children}</span>
			<span className="bg-muted-foreground/40 h-[1px] flex-1 bg-white/20" />
		</div>
	);
}

export {
	Card,
	Header,
	Description,
	Plan,
	PlanName,
	Badge,
	Price,
	MainPrice,
	Period,
	OriginalPrice,
	Body,
	List,
	ListItem,
	Separator,
};