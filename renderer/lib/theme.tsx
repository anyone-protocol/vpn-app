import { extendTheme, ThemeConfig } from "@chakra-ui/react";
// import mona sans font from google fonts

const fonts = {
  heading: `'Mona Sans', sans-serif`,
  body: `'Mona Sans', sans-serif`,
  mono: `'Mona Sans', monospace`,
};

const breakpoints = {
  sm: "40em",
  md: "52em",
  lg: "64em",
  xl: "80em",
};

// Define the config object for initial color mode
const config: ThemeConfig = {
  initialColorMode: "dark", // Set dark mode as the default
  useSystemColorMode: false,
};

// Extend the theme with config, colors, and other settings
const theme = extendTheme({
  config, // Make sure config is passed here
  semanticTokens: {
    colors: {
      text: {
        default: "#16161D",
        _dark: "#ade3b8",
      },
      heroGradientStart: {
        default: "#7928CA",
        _dark: "#e3a7f9",
      },
      heroGradientEnd: {
        default: "#FF0080",
        _dark: "#fbec8f",
      },
    },
    radii: {
      button: "12px",
    },
  },
  colors: {
    black: "#16161D",
  },
  fonts,
  breakpoints,
});

export default theme;
