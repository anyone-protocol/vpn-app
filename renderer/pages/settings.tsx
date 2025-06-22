// renderer/pages/settings.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Stack,
  FormControl,
  FormLabel,
  Switch,
  IconButton,
  Flex,
  useColorMode,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, useColorModeValue } from "@chakra-ui/icons";

import { ArrowBackIcon } from "@chakra-ui/icons";
import AppHeader from "../components/AppHeader";
import { motion } from "framer-motion";
import { FiSettings } from "react-icons/fi";
import { GrUpdate } from "react-icons/gr";
import { FaPowerOff } from "react-icons/fa6";
import { useAppContext } from "../context/AppProvider";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.5,
      when: "beforeChildren",
      staggerChildren: 0.3,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

function SettingsPage() {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false);
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState<boolean>(false);
  const { isExpanded, setIsExpanded, showAnimations, setShowAnimations } = useAppContext();

  useEffect(() => {
    if (typeof window !== "undefined" && window.ipc) {
      console.log("window.ipc:", window.ipc);
      // Load the current preference
      window.ipc.getAutoUpdatePreference().then((enabled) => {
        setAutoUpdateEnabled(enabled);
      });

      window.ipc.isAutoLaunchEnabled().then(setAutoLaunchEnabled);

      // Listen for update events
      const removeUpdateAvailableListener = window.ipc.onUpdateAvailable(() => {
        setUpdateAvailable(true);
        setUpdateStatus("A new update is available.");
      });

      const removeUpdateDownloadedListener = window.ipc.onUpdateDownloaded(
        () => {
          setUpdateDownloaded(true);
          setUpdateStatus("Update downloaded. Ready to install.");
        }
      );

      return () => {
        // Clean up event listeners
        removeUpdateAvailableListener();
        removeUpdateDownloadedListener();
      };
    }
  }, []);

  const handleToggle = async () => {
    const newValue = !autoUpdateEnabled;
    setAutoUpdateEnabled(newValue);
    await window.ipc.setAutoUpdatePreference(newValue);

    if (newValue) {
      // If auto-updates are enabled, check for updates
      setUpdateStatus("Auto-updates are enabled.");

      window.ipc.checkForUpdates();
    } else {
      setUpdateStatus("Auto-updates are disabled.");
    }
  };

  const handleDownloadUpdate = () => {
    window.ipc.downloadUpdate();
    setUpdateStatus("Downloading update...");
  };

  const handleInstallUpdate = () => {
    window.ipc.installUpdate();
  };

  const handleAutoLaunchToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const enable = event.target.checked;
    setAutoLaunchEnabled(enable);
    if (window.ipc) {
      await window.ipc.setAutoLaunch(enable);
    }
  };

  // timeout reset status after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setUpdateStatus("");
    }, 2000);
    return () => clearTimeout(timeout);
  }, [updateStatus]);

  const bgColor = useColorModeValue("white", "#18181B");
  const cardBgColor = useColorModeValue("white", "#18181B");
  const headerBgColor = useColorModeValue("#558D91", "#131315");
  const headerTextColor = useColorModeValue("white", "white");
  const ipcCardText = useColorModeValue("#558D91", "#27D7F2");
  const menuTextColor = useColorModeValue("black", "white");
  const mainContainerBgColor = useColorModeValue(
    "radial-gradient(164.53% 66.45% at 0% 100%, rgb(87 224 245 / 33%) 0%, rgb(255 255 255 / 13%) 100%), rgb(255 255 255 / 33%)",

    "radial-gradient(164.53% 66.45% at 0% 100%, rgba(87, 224, 245, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), rgba(24, 24, 27, 0.50)"
  );
  const textColor = useColorModeValue("black", "#B7F2FB");
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <Box
        minH="100vh"
        bg={bgColor}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          w="400px"
          h="100vh"
          bg={cardBgColor}
          borderRadius="6px"
          boxShadow="lg"
          overflow="hidden"
          border="1px solid #27272A"
        >
          {/* Header */}

          <AppHeader
            expanded={false}
            showMenu={true} // Set to false if you don't want the menu
            bgColor={bgColor}
            headerBgColor={headerBgColor}
            headerTextColor={headerTextColor}
            menuTextColor={menuTextColor}
            onExpandToggle={() => {
              if (window.ipc) {
                window.ipc.expandApp();
              }
            }}
            onSettingsClick={() => {
              if (window.ipc) {
                window.ipc.openSettingsWindow();
              }
            }}
            onQuitClick={() => {
              if (window.ipc) {
                window.ipc.hideSettingsWindow();
              }
            }}
            isSettingsPage={true}
          />

          {/* Main Content */}
          <motion.div
            variants={childVariants}
            style={{ height: "100%", width: "100%" }}
          >
            <Box p={0} textAlign="center" overflowY="auto" h="100%">
              <Stack
                spacing={4}
                align="center"
                justifyContent="flex-start"
                h="100%"
                background={mainContainerBgColor}
                p="14px 24px"
              >
                {/* <IconButton
                  aria-label="Back to home"
                  icon={<ArrowBackIcon />}
                  onClick={() => window.ipc.closeSettingsWindow()}
                  position="absolute"
                  top={2}
                  right={2}
                /> */}

                <Stack spacing={0} w="100%">
                  <Flex align={"baseline"} w="100%" gap="10px" mb={6}>
                    <FiSettings color={menuTextColor} size="18px" />
                    <Text
                      textAlign="center"
                      fontSize="24px"
                      fontWeight={500}
                      color={ipcCardText}
                      mt="-5px"
                    >
                      App Settings
                    </Text>
                  </Flex>

                  {/* <Flex
                    align={"center"}
                    w="100%"
                    gap="5px"
                    p="14px"
                    position={"relative"}
                  >
                    <Box
                      position="absolute"
                      bottom={0}
                      left={0}
                      width="100%"
                      height="1px"
                      background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
                    />
                    <Box w="16px" mt="-2px">
                      {colorMode === "light" ? (
                        <MoonIcon color="#27D7F2" w="16px" />
                      ) : (
                        <SunIcon color="#27D7F2" w="16px" />
                      )}
                    </Box>
                    <FormControl
                      display="flex"
                      alignItems="center"
                      justifyContent={"space-between"}
                      color={textColor}
                    >
                      <FormLabel
                        htmlFor="color-mode-toggle"
                        mb="0"
                        fontSize="18px"
                      >
                        {colorMode === "dark" ? "Light Mode" : "Dark Mode"}
                      </FormLabel>
                      <Switch
                        id="color-mode-toggle"
                        isChecked={colorMode === "dark"}
                        onChange={toggleColorMode}
                        sx={{
                          "span.chakra-switch__track": {
                            bg: "#558D91", // Off state color for track
                            _checked: {
                              bg: "#27D7F2", // On state color for track
                            },
                          },
                          "span.chakra-switch__thumb": {
                            bg: "white", // Thumb color
                          },
                        }}
                      />
                    </FormControl>
                  </Flex> */}

                  <Flex
                    align={"center"}
                    w="100%"
                    gap="5px"
                    p="14px"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      bottom={0}
                      left={0}
                      width="100%"
                      height="1px"
                      background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
                    />
                    <Box w="16px" mt="0px">
                      <GrUpdate color="#27D7F2" size="16px" />
                    </Box>
                    <FormControl
                      display="flex"
                      alignItems="center"
                      justifyContent={"space-between"}
                      color={textColor}
                    >
                      <FormLabel
                        htmlFor="animations-toggle"
                        mb="0"
                        fontSize="18px"
                      >
                        Globe Animations
                      </FormLabel>
                      <Switch
                        id="animations-toggle"
                        isChecked={showAnimations}
                        onChange={() => {
                          window.ipc.setShowAnimations(!showAnimations);
                        }}
                        sx={{
                          "span.chakra-switch__track": {
                            bg: "#558D91", // Off state color for track
                            _checked: {
                              bg: "#27D7F2", // On state color for track
                            },
                          },
                          "span.chakra-switch__thumb": {
                            bg: "white", // Thumb color
                          },
                        }}
                      />
                    </FormControl>
                  </Flex>
                  
                  <Flex
                    align={"center"}
                    w="100%"
                    gap="5px"
                    p="14px"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      bottom={0}
                      left={0}
                      width="100%"
                      height="1px"
                      background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
                    />
                    <Box w="16px" mt="0px">
                      <GrUpdate color="#27D7F2" size="16px" />
                    </Box>
                    <FormControl
                      display="flex"
                      alignItems="center"
                      justifyContent={"space-between"}
                      color={textColor}
                    >
                      <FormLabel
                        htmlFor="auto-update-toggle"
                        mb="0"
                        fontSize="18px"
                      >
                        Enable Auto Updates
                      </FormLabel>
                      <Switch
                        id="auto-update-toggle"
                        isChecked={autoUpdateEnabled}
                        onChange={handleToggle}
                        sx={{
                          "span.chakra-switch__track": {
                            bg: "#558D91", // Off state color for track
                            _checked: {
                              bg: "#27D7F2", // On state color for track
                            },
                          },
                          "span.chakra-switch__thumb": {
                            bg: "white", // Thumb color
                          },
                        }}
                      />
                    </FormControl>
                  </Flex>
                  {/* {updateStatus && (
                    <Text mt={2} color="#558D91">
                      {updateStatus}
                    </Text>
                  )} */}
                  {/* {!autoUpdateEnabled && updateAvailable && (
                    <Button onClick={handleDownloadUpdate} mt={2}>
                      Download Update
                    </Button>
                  )}
                  {updateDownloaded && (
                    <Button onClick={handleInstallUpdate} mt={2}>
                      Install Update
                    </Button>
                  )} */}

                  <Flex
                    align={"center"}
                    w="100%"
                    gap="5px"
                    p="14px"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      bottom={0}
                      left={0}
                      width="100%"
                      height="1px"
                      background="linear-gradient(to right, rgba(22, 81, 103, 0), rgba(22, 81, 103, 0.8), rgba(22, 81, 103, 0))"
                    />
                    <Box w="16px" mt="0px">
                      <FaPowerOff color="#27D7F2" size="16px" />
                    </Box>
                    <FormControl
                      display="flex"
                      alignItems="center"
                      justifyContent={"space-between"}
                      color={textColor}
                    >
                      <FormLabel htmlFor="auto-launch" mb="0" fontSize="18px">
                        Open at Startup
                      </FormLabel>
                      <Switch
                        id="auto-launch"
                        isChecked={autoLaunchEnabled}
                        onChange={handleAutoLaunchToggle}
                        sx={{
                          "span.chakra-switch__track": {
                            bg: "#558D91", // Off state color for track
                            _checked: {
                              bg: "#27D7F2", // On state color for track
                            },
                          },
                          "span.chakra-switch__thumb": {
                            bg: "white", // Thumb color
                          },
                        }}
                      />
                    </FormControl>
                  </Flex>
                </Stack>
              </Stack>
            </Box>
          </motion.div>
        </Box>
      </Box>
    </motion.div>
  );
}

export default SettingsPage;
