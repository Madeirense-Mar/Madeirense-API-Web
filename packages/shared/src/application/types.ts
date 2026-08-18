export namespace Application$Types {
    type themes = (
        |   "sea"
        |   "land"
    );

    type themeVariants = (
        |   "dark"
        |   "light"
    );

    export type themetype = `${themes}${`-${themeVariants}` | ""}`;
};