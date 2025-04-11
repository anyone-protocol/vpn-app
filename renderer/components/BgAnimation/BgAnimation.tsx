import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import anyoneBg from "../../assets/Anyone-logo-animation.json";
import { Box } from "@chakra-ui/react";

const BgAnimations = ({ autoplay = true, loop = true, expanded }) => {
  const animationContainer = useRef(null);

  useEffect(() => {
    lottie
      .loadAnimation({
        container: animationContainer.current,
        renderer: "svg",
        loop: loop,
        autoplay: autoplay,
        animationData: anyoneBg,
      })
      .setSpeed(0.2);
  }, []);

  return (
    <Box
      // position="absolute"
      // top={expanded ? "-56.5px" : "6px"}
      // left={expanded ? "-176.5px" : "-176.5px"}
      ml="-5px"
      mt="4px"
      w="345px"
      height={"380px"}
      ref={animationContainer}
      zIndex={0}
      pointerEvents="none"
    ></Box>
  );
};

export default BgAnimations;
