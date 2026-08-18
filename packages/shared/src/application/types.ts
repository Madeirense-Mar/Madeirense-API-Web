export namespace Application$Types {
    export namespace Themes {
        export type options = (
            |   "sea"
            |   "land"
        );
    
        export type variants = (
            |   "dark"
            |   "light"
        );
    
        export type types = `${options}-${variants}`;
    }
};