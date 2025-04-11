import {
  Flex,
  Text,
  Box,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { TbCopy, TbCopyCheck } from "react-icons/tb";
import { useState } from "react";
import { useAppContext } from "../context/AppProvider";
import { ipcMain } from "electron";
import { IoInformationCircleOutline } from "react-icons/io5";
import { FiSettings } from "react-icons/fi";
import { SlArrowRight } from "react-icons/sl";
import { SlArrowLeft } from "react-icons/sl";
import { PortComponent } from "./PortComponent";
import { SettingsComponent } from "./SettingsComponent";
interface IPCardProps {
  label: string;
  value: string;
  bgColor: string;
  menuTextColor: string;
  headerBgColor: string;
  status: string;
}

const IPCard: React.FC<IPCardProps> = ({
  label,
  value,
  bgColor,
  menuTextColor,
  headerBgColor,
  status,
}) => {
  const {
    proxyPort,
    realIP,
    proxyRunning,
    isLoading,
    anyonePort,
    isExpanded: expanded,
    setIsExpanded,
  } = useAppContext();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [isCopied, setIsCopied] = useState(false);
  const [newPort, setNewPort] = useState(proxyPort);

  const [newAnyonePort, setNewAnyonePort] = useState(anyonePort);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);

    // Reset the icon after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  // const handlePortChange = () => {
  //   if (!proxyRunning) {
  //     window.ipc.changeProxyPort(newPort);
  //     onClose();
  //   }
  // };

  const handleAnyonePortChange = () => {
    if (!proxyRunning) {
      window.ipc.changeAnonPort(newAnyonePort);
      onClose();
    }
  };

  // onExpandClick={() => {
  //   if (window.ipc) {
  //     window.ipc.expandApp();
  //     console.log("Expanding App");
  //   }
  //   setIsExpanded(!isExpanded);
  // }}
  // onMinimizeClick={() => {
  //   if (window.ipc) {
  //     window.ipc.minimizeExpandedApp();
  //     console.log("Minimizing App");
  //   }
  //   setIsExpanded(!isExpanded);
  // }}

  const handleExpandClick = () => {
    if (window.ipc) {
      window.ipc.expandApp();
      console.log("Expanding App");
    }
    setIsExpanded(!expanded);
  };

  const handleMinimizeClick = () => {
    if (window.ipc) {
      window.ipc.minimizeExpandedApp();
      console.log("Minimizing App");
    }
    setIsExpanded(!expanded);
  };

  return (
    <>
      <Flex
        flexDirection="row"
        justify="space-between"
        align="center"
        gap={1}
        padding="10px 15px"
        borderRadius="0px"
        background={bgColor}
        border="1px solid #1c2f30"
        borderLeft={"none"}
        borderRight={"none"}
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          transition: "opacity 0.5s",
        }}
        w="100%"
      >
        <Text fontSize="xs" fontWeight="500" color={menuTextColor}>
          {label}
        </Text>
        <Flex gap="5px">
          <Text fontSize="xs" fontWeight="500" color={headerBgColor}>
            {value}
          </Text>
          {isCopied ? (
            <TbCopyCheck
              size="15px"
              color={menuTextColor}
              style={{ cursor: "pointer", marginTop: "2px" }}
            />
          ) : (
            <TbCopy
              size="14px"
              color={menuTextColor}
              style={{ cursor: "pointer", marginTop: "2px" }}
              onClick={handleCopy}
            />
          )}
        </Flex>

        <Box>
          {status === "Anyone" ? (
            <Text fontSize="xs" fontWeight="500" color="#00ff00">
              Anon
            </Text>
          ) : (
            <Text fontSize="xs" fontWeight="500" color="#ff0000">
              Not Anon
            </Text>
          )}
        </Box>

        <Button size="sm" onClick={onOpen} ml={2} colorScheme="">
          <IoInformationCircleOutline color={menuTextColor} />
        </Button>

        {/* expand and minimize buttons */}
        {expanded ? (
          <Button size="sm" onClick={handleMinimizeClick} ml={2} colorScheme="">
            <SlArrowLeft color={menuTextColor} />
          </Button>
        ) : (
          <Button size="sm" onClick={handleExpandClick} ml={2} colorScheme="">
            <SlArrowRight color={menuTextColor} />
          </Button>
        )}
      </Flex>

      {/* Drawer for Real IP and Proxy Port */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent
          style={{
            background: "rgba(24, 24, 27, 0.50",
            boxShadow: "0px 1px 0px 0px rgba(255, 255, 255, 0.08) inset",
            backdropFilter: "blur(4px)",
          }}
        >
          <DrawerCloseButton />
          <DrawerHeader>Settings Info</DrawerHeader>
          <DrawerBody
            bg={"rgba(24, 24, 27, 0.90"}
            boxShadow={"0px 1px 0px 0px rgba(255, 255, 255, 0.08) inset"}
          >
            <Flex
              mb={2}
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
              <Text
                fontWeight="400"
                fontSize="14px"
                color={headerBgColor}
                mb={2}
              >
                Real IP:
              </Text>
              <Text fontSize="sm">{realIP}</Text>
            </Flex>
            {/* <PortComponent
              headerBgColor={headerBgColor}
              newPort={newPort}
              portName="Proxy Port"
              proxyRunning={proxyRunning}
              isLoading={isLoading}
              setNewPort={setNewPort}
              handlePortChange={handlePortChange}
            /> */}
            {/* <PortComponent
              headerBgColor={headerBgColor}
              newPort={newAnyonePort}
              portName="Anyone Port"
              proxyRunning={proxyRunning}
              isLoading={isLoading}
              setNewPort={setNewAnyonePort}
              handlePortChange={handleAnyonePortChange}
            /> */}
            <SettingsComponent headerBgColor={headerBgColor} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default IPCard;
