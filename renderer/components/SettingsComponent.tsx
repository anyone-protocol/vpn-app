import {
  Box,
  Flex,
  Text,
  Switch,
  FormControl,
  FormLabel,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaPen } from "react-icons/fa";
import { useEffect, useState } from "react";
import { GrUpdate } from "react-icons/gr";
import { FaPowerOff } from "react-icons/fa6";

export const SettingsComponent = ({
  headerBgColor,
}: {
  headerBgColor: string;
}) => {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false);
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState<boolean>(false);
  const textColor = useColorModeValue("black", "#B7F2FB");

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
  return (
    <>
      <Flex
        align={"center"}
        w="100%"
        gap="5px"
        p="14px 5px"
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
            fontWeight="400"
            fontSize="14px"
            color={headerBgColor}
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
      {updateStatus && (
        <Text mt={2} color="#558D91">
          {updateStatus}
        </Text>
      )}
      {!autoUpdateEnabled && updateAvailable && (
        <Button onClick={handleDownloadUpdate} mt={2}>
          Download Update
        </Button>
      )}
      {updateDownloaded && (
        <Button onClick={handleInstallUpdate} mt={2}>
          Install Update
        </Button>
      )}

      <Flex
        align={"center"}
        w="100%"
        gap="5px"
        p="14px 5px"
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
          <FormLabel
            htmlFor="auto-launch"
            mb="0"
            fontWeight="400"
            fontSize="14px"
            color={headerBgColor}
          >
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
    </>
  );
};
