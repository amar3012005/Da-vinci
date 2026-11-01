// Brain-mode shell build: the Brain sidebar draws no employee avatars, so the 700 KB Humation art and renderer are replaced by inert stand-ins.
// Nothing here throws: a component that asks for an avatar draws nothing.
export const humation1 = { template: { id: 'brain-shell-stub', version: 0 }, crops: {}, slots: {}, parts: [] };
export const Avatar = () => null;
export const createAvatar = () => ({ toJSON: () => ({ template: humation1.template.id, selections: {}, colors: {}, background: 'transparent', crop: 'avatar' }) });
export const getPartsForSlot = () => [];
