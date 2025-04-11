import { Flex, IconButton, Box } from "@chakra-ui/react";
import { MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";

const ZoomControls = ({ onZoomIn, onZoomOut }) => {
  return (
    <Box
      position="fixed"
      bottom="50px"
      right="40px"
      background="rgba(255, 255, 255, 0.04)"
      borderRadius="32px"
      border="1px solid rgba(255, 255, 255, 0.04)"
      p="2px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxShadow={"0px 1px 0px 0px rgba(255, 255, 255, 0.08) inset"}
    >
      <Flex borderRadius="30px" overflow="hidden" alignItems="center">
        <IconButton
          aria-label="Zoom In"
          icon={<MdOutlineZoomIn size="18px" />}
          onClick={onZoomIn}
          bg="transparent"
          borderRadius="0"
          borderRight="1px solid rgba(255, 255, 255, 0.2)" // Middle border
          _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          _focus={{ outline: "none" }}
          size="xs"
          p="12px"
        />
        <IconButton
          aria-label="Zoom Out"
          icon={<MdOutlineZoomOut size="18px" />}
          onClick={onZoomOut}
          bg="transparent"
          borderRadius="0"
          _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          _focus={{ outline: "none" }}
          size="xs"
          p="12px"
        />
      </Flex>
    </Box>
  );
};

export default ZoomControls;
