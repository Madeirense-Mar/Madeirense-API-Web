import type {
	$Enums
} from "@Madeirense/database/browser";


export namespace Application$Types {
    export namespace Themes {
        export type options = keyof typeof $Enums.Application_Theme_theme;
    
        export type variants = (
            |   "DARK"
            |   "LIGHT"
        );
    
        export type types = `${options}-${variants}`;
    }
};