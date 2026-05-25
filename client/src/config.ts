export const getConfig = () => {
    const defaultConfig = {
        brand: {
            favicon: "/zksys-icon.svg",
            logo: {
                dark: "/zksys-icon.svg"
            },
            theme: {
                primary: "rgb(1, 2, 20)",
                secondary: "rgba(255, 255, 255, 0.2)"
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