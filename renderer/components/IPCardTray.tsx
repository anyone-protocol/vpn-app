import { Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { TbCopy, TbCopyCheck } from "react-icons/tb";
import { useState } from "react";
import { FaExpandAlt } from "react-icons/fa";

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
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);

    // Reset the icon after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <>
      <Flex
        flexDirection="row"
        justify="space-between"
        align="center"
        gap={1}
        padding="1em 1.5em"
        borderRadius="6px"
        background={bgColor + "6E"}
        border="1px solid #1c2f30"
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
        <FaExpandAlt
          size="14px"
          color={menuTextColor}
          onClick={window.ipc.showMainWindow}
          style={{ cursor: "pointer", marginTop: "2px" }}
        />
      </Flex>
    </>
  );
};

export default IPCard;
