import React from "react";
import { Box, Text, Circle } from "@chakra-ui/react";
import MinimizedMapComponent from "./MinimizedMapComponent";

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  countryCode: string;
}
interface ProxyStatusProps {
  isLoading: boolean;
  proxyRunning: boolean;
  realLocation: LocationData;
  relayLocation: LocationData;
  proxyLocation: LocationData;
  bgColor: string;
  menuTextColor: string;
  connectionTime: number;
  showCountries: boolean;
  expanded: boolean;
  handleStartProxy: () => void;
  handleStopProxy: () => void;
  numberOfRelays: number;
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${hrs} : ${mins} : ${secs}`;
};

const ProxyStatus: React.FC<ProxyStatusProps> = ({
  isLoading,
  proxyRunning,
  realLocation,
  relayLocation,
  proxyLocation,
  bgColor,
  menuTextColor,
  connectionTime,
  expanded = false,
  handleStartProxy,
  handleStopProxy,
  showCountries,
  numberOfRelays,
}) => {
  const [hovered, setHovered] = React.useState(false);

  const statusText = isLoading
    ? proxyRunning
      ? "Disconnecting"
      : "Connecting"
    : hovered
    ? proxyRunning
      ? "Disconnect"
      : "Connect"
    : proxyRunning
    ? "Connected"
    : "Click to Connect";

  const statusColor = isLoading
    ? "red.500"
    : proxyRunning
    ? "green.500"
    : "red.500";

  return (
    <Box
      // bg={bgColor}
      // position={expanded ? "absolute" : "absolute"}
      // top={expanded ? "52%" : "52%"}
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
        onClick={proxyRunning || isLoading ? handleStopProxy : handleStartProxy}
        _hover={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Circle size="10px" bg={statusColor} />
        <Text fontWeight="500" fontSize="14px" color={menuTextColor}>
          {statusText}
        </Text>
      </Box>

      {/* Timer Display */}
      {proxyRunning && !isLoading && (
        <Box display="flex" alignItems="center" justifyContent={"center"}>
          <Text
            fontSize="24px"
            fontWeight="bold"
            mt={2}
            color={menuTextColor}
            textAlign="left"
          >
            {formatTime(connectionTime)}
          </Text>
        </Box>
      )}

      {realLocation && proxyLocation && showCountries && proxyRunning && (
        <Box
          width="100%"
          mt={3}
          zIndex={1}
          display="flex"
          alignItems="center"
          justifyContent={"center"}
          flexDirection={"column"}
        >
          {/* {!expanded && ( */}
          <MinimizedMapComponent
            realLocation={realLocation}
            relayLocation={relayLocation}
            proxyLocation={proxyLocation}
            numberOfRelays={numberOfRelays}
          />
          {/* )} */}
        </Box>
      )}
    </Box>
  );
};

export default ProxyStatus;
