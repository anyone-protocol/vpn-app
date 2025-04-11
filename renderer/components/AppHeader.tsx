import React from "react";
import {
  Box,
  Heading,
  Flex,
  IconButton,
  Spacer,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, useColorModeValue } from "@chakra-ui/icons";
import { FiSettings, FiMoreVertical } from "react-icons/fi";
import { CloseIcon, MinusIcon } from "@chakra-ui/icons";
import { FaExpandAlt } from "react-icons/fa";
import Logo from "../components/Icons/Logo";
import { on } from "events";

interface AppHeaderProps {
  expanded: boolean;
  showMenu?: boolean;
  bgColor: string;
  headerBgColor: string;
  headerTextColor: string;
  menuTextColor: string;
  onExpandToggle?: () => void;
  onSettingsClick?: () => void;
  onQuitClick?: () => void;
  isSettingsPage?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  expanded,
  showMenu = true,
  bgColor,
  headerBgColor,
  headerTextColor,
  menuTextColor,
  onExpandToggle,
  onSettingsClick,
  onQuitClick,
  isSettingsPage,
}) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const menubg = useColorModeValue("blackAlpha.50", "blackAlpha.900");
  const border = useColorModeValue(
    "1px solid rgba(22, 81, 103, 0.00)",
    "1px solid #27272A"
  );
  const logoColor = useColorModeValue("#091010", "#D4D4D8");

  return (
    <Box
      bg={headerBgColor}
      color={headerTextColor}
      p="8px 24px"
      css={{ WebkitAppRegion: "drag" }}
      zIndex={100}
      position="relative"
      border={`${border}`}
      boxShadow="0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.10);"
    >
      <Flex alignItems="center">
        {/* App Title */}
        <Heading as="h1" size="md" ml={2}>
          <Logo color={logoColor} />
        </Heading>
        <Spacer />

        {/* Dark Mode Toggle */}
        {/* <IconButton
          aria-label="Toggle color mode"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          variant="ghost"
          color={headerTextColor}
          onClick={toggleColorMode}
          mr={2}
          css={{ WebkitAppRegion: "no-drag" }}
          size="xs"
        /> */}

        {/* Window Control Buttons */}
        {/* <IconButton
          aria-label="Minimize"
          icon={<MinusIcon />}
          variant="ghost"
          color={headerTextColor}
          size="xs"
          onClick={() => {
            if (window.ipc) {
              window.ipc.minimizeApp();
            }
          }}
          mr={1}
          css={{ WebkitAppRegion: "no-drag" }}
        /> */}

        {/* <IconButton
          aria-label={expanded ? "Minimize Expanded" : "Expand"}
          icon={<FaExpandAlt />}
          variant="ghost"
          color={headerTextColor}
          size="xs"
          onClick={() => {
            if (window.ipc && onExpandToggle) {
              onExpandToggle();
            }
          }}
          mr={1}
          css={{ WebkitAppRegion: "no-drag" }}
        />
        <IconButton
          aria-label="Close"
          icon={<CloseIcon />}
          variant="ghost"
          color={headerTextColor}
          size="xs"
          onClick={onQuitClick}
          css={{ WebkitAppRegion: "no-drag" }}
        /> */}
        {isSettingsPage ? (
          <IconButton
            aria-label="Close"
            icon={<CloseIcon />}
            variant="ghost"
            color={headerTextColor}
            size="xs"
            onClick={onQuitClick}
            css={{ WebkitAppRegion: "no-drag" }}
          />
        ) : (
          <IconButton
            aria-label="settings"
            icon={<FiSettings />}
            variant="ghost"
            color={headerTextColor}
            size="xs"
            onClick={onSettingsClick}
            css={{ WebkitAppRegion: "no-drag" }}
          />
        )}

        {/* Conditionally show the three-dot menu */}
        {showMenu && (
          <>
            {/* <MenuItem
              icon={<FiSettings />}
              onClick={onSettingsClick}
              css={{ WebkitAppRegion: "no-drag" }}
              bg={bgColor}
              _hover={{ bg: menubg }}
            >
              Settings
            </MenuItem>
            <MenuItem
              icon={<CloseIcon />}
              onClick={onQuitClick}
              css={{ WebkitAppRegion: "no-drag" }}
              bg={bgColor}
              _hover={{ bg: menubg }}
            >
              {isSettingsPage ? "Close" : "Quit"}
            </MenuItem> */}
          </>
          // <Menu>
          //   <MenuButton
          //     as={IconButton}
          //     aria-label="Options"
          //     icon={<FiMoreVertical />}
          //     variant="ghost"
          //     color={headerTextColor}
          //     css={{ WebkitAppRegion: "no-drag" }}
          //     size="xs"
          //   />
          //   <MenuList
          //     css={{ WebkitAppRegion: "no-drag" }}
          //     color={menuTextColor}
          //     bg={bgColor}
          //   >
          //     {!isSettingsPage && (
          //       <MenuItem
          //         icon={<FiSettings />}
          //         onClick={onSettingsClick}
          //         css={{ WebkitAppRegion: "no-drag" }}
          //         bg={bgColor}
          //         _hover={{ bg: menubg }}
          //       >
          //         Settings
          //       </MenuItem>
          //     )}
          //     <MenuItem
          //       icon={<CloseIcon />}
          //       onClick={onQuitClick}
          //       css={{ WebkitAppRegion: "no-drag" }}
          //       bg={bgColor}
          //       _hover={{ bg: menubg }}
          //     >
          //       {isSettingsPage ? "Close" : "Quit"}
          //     </MenuItem>
          //   </MenuList>
          // </Menu>
        )}
      </Flex>
    </Box>
  );
};

export default AppHeader;
