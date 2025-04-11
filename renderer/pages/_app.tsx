import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";

import theme from "../lib/theme";

import { AppProps } from "next/app";
import { AppProvider } from "../context/AppProvider";
// import { IpcHandler } from "../../main/preload";

// declare global {
//   interface Window {
//     ipc: IpcHandler;
//   }
// }

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={"dark"} />

        <Component {...pageProps} />
      </ChakraProvider>
    </AppProvider>
  );
}

export default MyApp;
