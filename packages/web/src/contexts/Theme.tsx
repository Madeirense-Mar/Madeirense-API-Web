//#region Imports -----------------------------------------
import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    Root$Enumerators
} from "styles/enumerators";

import {
    Application$Types
} from "@Madeirense/shared";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
interface ThemeContextType {
    currentTheme: Application$Types.Themes.types,
    switchTheme: () => void;
    toggleVariant: () => void;
};
//#endregion

//#region Context declarations ----------------------------
const ThemeContext = createContext<ThemeContextType>({
    currentTheme: "SEA-DARK",
    switchTheme: () => { },
    toggleVariant: () => { }
});
//#endregion

const ThemeProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const [currentTheme, setCurrentTheme] = useState<Application$Types.Themes.types>("SEA-DARK");
    //#endregion
    
    //#region Functions -----------------------------------
    /** 
     * Toggles between `LAND` and `SEA` themes. Only active on development environments 
     */
    const switchTheme = () => {
        let theme: Application$Types.Themes.options = (currentTheme.split("-")[0] as Application$Types.Themes.options);

        switch (theme) {
            case "LAND": theme = "SEA"; break;
            case "SEA": theme = "LAND"; break;
        
            default:
                break;
        }

        setCurrentTheme(ct => (
            `${theme}-${ct.split("-")[1] as Application$Types.Themes.variants}` 
        ));
    };

    /**
     * Toggles between `Light` and `Dark`.
     */
    const toggleVariant = () => {
        const hasVariant = currentTheme.includes("-");

        if (!hasVariant)
            return;

        let variant: Application$Types.Themes.variants = (currentTheme.split("-")[1] as Application$Types.Themes.variants);

        switch (variant) {
            case "DARK": variant = "LIGHT"; break;
            case "LIGHT": variant = "DARK"; break;
        
            default:
                break;
        }

        setCurrentTheme(ct => (
            `${ct.split("-")[0] as Application$Types.Themes.options}-${variant}` 
        ));
    };
    //#endregion

    //#region Effects -------------------------------------
    useEffect(() => {
        const $body = document.body;

        if (!$body)
            return;

        // Must find the nearest and select it. 
        // Madeirense mar (near the SEA) is Sea
        // The other one is LAND.
        // The resort is also the SEA theme.
        $body.setAttribute(Root$Enumerators.Attributes.Styles.theme, currentTheme);
    }, [currentTheme]);
    //#endregion

    return <ThemeContext.Provider value={{ currentTheme, switchTheme, toggleVariant }}>
        <>{children}</>
    </ThemeContext.Provider>
};

//#region Hooks -------------------------------------------
const useTheme = () => {
    let context = useContext(ThemeContext);
    
    if (!context) throw new Error(`'useModal' was used outside of its context.`);
    
    return context;
};
//#endregion

export {
    ThemeProvider,
    useTheme
};