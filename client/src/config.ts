export const getConfig = () => {
    const defaultConfig = {
        brand: {
            favicon: "/syscoin-icon.svg",
            logo: {
                dark: "/syscoin-icon.svg"
            },
            theme: {
                primary: "#1f5eff",
                secondary: "#0b1f5e"
            }
        }
    };

    const customization = process.env.REACT_APP_CUSTOMIZATION;
    if(!customization || customization === "undefined") {
        return defaultConfig;
    }

    try {
        return JSON.parse(customization);
    } catch {
        return defaultConfig;
    }
};