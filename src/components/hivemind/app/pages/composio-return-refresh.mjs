// OAuth query parameters request a refresh; only provider-backed server data
// can establish that an account is connected.
export async function refreshComposioReturn(api, toolkit) {
  await api.listOAuthConnectors();
  const data = await api.listComposioToolkits({ search: toolkit, limit: 24 });
  return (data.toolkits || []).some((item) => item.slug === toolkit && item.connected === true);
}
