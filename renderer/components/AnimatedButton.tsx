// AnimatedButton.tsx
import { Box } from "@chakra-ui/react";
import React from "react";
import dynamic from "next/dynamic";

import Logo from "./LottieAnimation/Logo";

const BgAnimation = dynamic(() => import("./BgAnimation/BgAnimation"), {
  ssr: false,
});

interface AnimatedButtonProps {
  proxyRunning: boolean;
  handleStartProxy: () => void;
  handleStopProxy: () => void;
  isLoading: boolean;
  expanded: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  proxyRunning,
  handleStartProxy,
  handleStopProxy,
  isLoading,
  expanded,
}) => {
  return (
    <Box
      width="100%"
      height="375px"
      // p="0px 52.835px 0px 54.717px"
      // mt={!proxyRunning ? (expanded ? "-32%" : "-150px") : undefined}
      m="20px 0"
      overflow="hidden"
      cursor="pointer"
      onClick={proxyRunning || isLoading ? handleStopProxy : handleStartProxy}
      zIndex={0}
      display="flex"
      justifyContent={"center"}
      alignItems={"center"}
    >
      {/* Background Animation */}
      {(isLoading || proxyRunning) && (
        <BgAnimation autoplay={true} loop={true} expanded={expanded} />
      )}
      {/* <BgAnimation autoplay={true} loop={true} expanded={expanded} /> */}

      {/* Clickable Content */}
      {!proxyRunning && !isLoading && (
        <Box position="relative" zIndex={1} width="250px" height="250px">
          <Logo />
        </Box>
      )}
    </Box>
  );
};

export default AnimatedButton;
