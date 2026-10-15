async function appsResponse(response) {
  if (!response.ok) throw new Error([401, 403].includes(response.status) ? "Your app connections could not be verified. Please reload and try again." : "Apps are temporarily unavailable. Please try again.");
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error("The app response was incomplete. Please try again.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The app response was incomplete. Please try again.");
  return value;
}
export {
  appsResponse
};
