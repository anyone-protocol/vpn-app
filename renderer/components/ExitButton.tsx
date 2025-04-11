import React from "react";
import { Box, Text, Circle } from "@chakra-ui/react";
import MinimizedMapComponent from "./MinimizedMapComponent";
import { IoMdExit } from "react-icons/io";

interface ExitButtonProps {
  bgColor: string;
  menuTextColor: string;
  text: string;
  onClick: () => void;
}

const ProxyStatus: React.FC<ExitButtonProps> = ({
  bgColor,
  menuTextColor,
  text,
  onClick,
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Box
      w={"100%"}
      p="14px"
      borderLeft="none"
      borderRight={"none"}
      position={"relative"}
    >
      <Box
        position="absolute"
        top={0} // Apply the border to the bottom
        left={0}
        width="100%"
        height="1px" // Height of the border
        background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
      />
      <Box
        position="absolute"
        bottom={0} // Apply the border to the bottom
        left={0}
        width="100%"
        height="1px" // Height of the border
        background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
      />
      <Box
        display="flex"
        alignItems="center"
        justifyContent={"center"}
        gap={2}
        _hover={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        <IoMdExit size="20px" color={"#f56565"}  />
        <Text fontWeight="500" fontSize="14px" color={menuTextColor}>
          {text}
        </Text>
      </Box>
    </Box>
  );
};

export default ProxyStatus;
