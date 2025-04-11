// src/components/MinimizedMapComponent.tsx
import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

interface LocationData {
  country: string;
  countryCode: string;
}

interface MinimizedMapComponentProps {
  realLocation: LocationData;
  relayLocation: LocationData;
  proxyLocation: LocationData;
  numberOfRelays: number;
}

// Function to convert country code to emoji flag
const countryCodeToEmoji = (countryCode: string) => {
  {
    if (!countryCode) return "";
    return countryCode
      ?.toUpperCase()
      ?.replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }
};

const MinimizedMapComponent: React.FC<MinimizedMapComponentProps> = ({
  realLocation,
  relayLocation,
  proxyLocation,
  numberOfRelays,
}) => {
  return (
    <Box>
      <Flex justifyContent="center" alignItems="center">
        {/* Real IP Country Emoji Flag */}
        <Box textAlign="center" mx={2} borderRadius="6px">
          <Text fontSize="2xl">
            {realLocation?.countryCode
              ? countryCodeToEmoji(realLocation.countryCode)
              : "🌐"}
          </Text>
        </Box>

        {/* Relay IP Country Emoji Flag */}

        <Box textAlign="center" mx={2} borderRadius="6px">
          <Text fontSize="2xl">
            {relayLocation?.countryCode
              ? countryCodeToEmoji(relayLocation.countryCode)
              : "🌐"}
          </Text>
        </Box>

        {/* Proxy IP Country Emoji Flag */}
        <Box textAlign="center" mx={2} borderRadius="6px">
          <Text fontSize="2xl">
            {proxyLocation?.countryCode
              ? countryCodeToEmoji(proxyLocation.countryCode)
              : "🌐"}
          </Text>
        </Box>
      </Flex>
      {/* //numberOfRelays */}
      <Text textAlign="center" fontSize="xs" color="#fff">
        {numberOfRelays - 3} More Circuits
      </Text>
    </Box>
  );
};

export default MinimizedMapComponent;
