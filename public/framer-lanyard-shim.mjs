export const ControlType = new Proxy({}, { get: (_, key) => key });
export const RenderTarget = { current: null };
export const addPropertyControls = () => {};
export const withCSS = (Component) => Component;
