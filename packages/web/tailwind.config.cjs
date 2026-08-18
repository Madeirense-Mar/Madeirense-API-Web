/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                //#region Colors
                "accent": "#9b0808",

                "primary": "#0b5196",
                "primary-light": "#61a7ec",
                "primary-dark": "#05223d",

                "secondary": "#fbe200",
                "secondary-light": "#fff388",
                "secondary-dark": "#3f3900",

                "neutral": "#a2a2a2",
                "neutral-dark": "#1a1a1a",
                "neutral-light": "#fff",

                "success": "#8dd751",
                "success-dark": "#1a3404"
                //#endregion
            }
        }
    },
    plugins: [],
}