import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputRightAddon,
  Text,
} from "@chakra-ui/react";
import { FaPen } from "react-icons/fa";

export const PortComponent = ({
  headerBgColor,
  newPort,
  proxyRunning,
  isLoading,
  setNewPort,
  portName,
  handlePortChange,
}: {
  headerBgColor: string;
  newPort: number;
  proxyRunning: boolean;
  isLoading: boolean;
  setNewPort: (port: number) => void;
  portName: string;
  handlePortChange: () => void;
}) => {
  return (
    <Box>
      <Flex
        justifyContent={"space-between"}
        alignItems={"center"}
        position={"relative"}
        marginBottom="5px"
      >
        <Box
          position="absolute"
          bottom={0}
          left={0}
          width="100%"
          height="1px"
          background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
        />
        <Text fontWeight="400" fontSize="14px" color={headerBgColor}>
          {portName}:
        </Text>
        <InputGroup
          fontSize="12px"
          size="sm"
          border="1px solid #1c2f30"
          borderRadius="6px"
          w="150px"
          mb={2}
        >
          <Input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(parseInt(e.target.value))}
            isDisabled={proxyRunning}
            placeholder="Enter Proxy Port"
            size="sm"
            border="none"
            mt="4px"
          />
          <InputRightAddon bg="none" mt="4px" border="none">
            <FaPen
              color={proxyRunning || isLoading ? "#666" : "#fff"}
              style={{ cursor: "pointer" }}
              onClick={handlePortChange}
              size="14px"
            />
          </InputRightAddon>
        </InputGroup>
      </Flex>

      {proxyRunning ||
        (isLoading && (
          <Text fontSize="xs" color="red.500" mt={1}>
            Stop the proxy to change the port.
          </Text>
        ))}
    </Box>
  );
};
