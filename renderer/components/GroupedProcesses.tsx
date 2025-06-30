// components/GroupedProcesses.tsx
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Avatar,
  Box,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import React, { useMemo } from "react";

interface GroupedProcessInfo {
  processName: string;
  friendlyName: string;
  iconPath: string | null;
  count: number;
  pids: number[];
  remoteAddresses: string[];
  remotePorts: number[];
}

interface GroupedProcessesProps {
  groupedProcesses: GroupedProcessInfo[];
  proxyRunning: boolean;
  bgColor: string;
  showMore: boolean;
  setShowMore: (showMore: boolean) => void;
  total: number;
  isExpanded?: boolean;
}

const motionVariants = {
  expanded: { height: "750px", opacity: 1 },
  collapsed: { height: "0px", opacity: 0 },
};

const GroupedProcesses: React.FC<GroupedProcessesProps> = ({
  groupedProcesses,
  proxyRunning,
  bgColor,
  showMore,
  setShowMore,
  total,
  isExpanded = false,
}) => {
  const borderColor = "#1c2f30";

  // Preprocess groupedProcesses to remove duplicates
  const uniqueGroupedProcesses = useMemo(() => {
    return groupedProcesses.map((proc) => {
      const seen = new Set<string>();
      const uniquePids: number[] = [];
      const uniqueRemoteAddresses: string[] = [];
      const uniqueRemotePorts: number[] = [];

      proc.pids.forEach((pid, idx) => {
        const remoteAddress = proc.remoteAddresses[idx];
        const key = `${pid}-${remoteAddress}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePids.push(pid);
          uniqueRemoteAddresses.push(remoteAddress);
          uniqueRemotePorts.push(proc.remotePorts[idx]);
        }
      });

      return {
        ...proc,
        pids: uniquePids,
        remoteAddresses: uniqueRemoteAddresses,
        remotePorts: uniqueRemotePorts,
        count: uniquePids.length, // Update count to reflect unique entries
      };
    });
  }, [groupedProcesses]);

  return (
    <>
      {proxyRunning && groupedProcesses.length > 0 && (
        <Box
          bg={
            "radial-gradient(164.53% 66.45% at 0% 100%, rgba(87, 224, 245, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%),rgba(24, 24, 27, 0.70)"
          }
          w="100%"
          borderBottom="1px solid #1c2f30"
          maxH={"750px"}
          overflowY={"hidden"}
        >
          <Box w="100%" zIndex={1}>
            <motion.div
              initial="collapsed"
              animate={showMore ? "expanded" : "collapsed"}
              variants={motionVariants}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
            >
              <Accordion allowMultiple overflowX="hidden">
                {uniqueGroupedProcesses.map((proc, index) => (
                  <AccordionItem
                    key={index}
                    border={`1px solid ${borderColor}`}
                    w="300px"
                  >
                    <AccordionButton>
                      <Flex
                        flex="1"
                        align="center"
                        w="100%"
                        justify="space-between"
                      >
                        {proc.iconPath ? (
                          <Avatar
                            src={proc.iconPath}
                            name={proc.friendlyName}
                            size="sm"
                            mr={4}
                          />
                        ) : (
                          <Avatar name={proc.friendlyName} size="sm" mr={4} />
                        )}
                        <Box flex="1" textAlign="left">
                          <Text fontWeight="bold">{proc.friendlyName}</Text>
                          <Text fontSize="sm" color="gray.500">
                            {proc.count} Connection
                            {proc.count > 1 ? "s" : ""}
                          </Text>
                        </Box>
                      </Flex>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>PID</Th>
                            <Th>Remote Address</Th>
                            <Th>Remote Port</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {proc.pids.map((pid, idx) => (
                            <Tr key={idx}>
                              <Td>{pid}</Td>
                              <Td>{proc.remoteAddresses[idx]}</Td>
                              <Td>{proc.remotePorts[idx]}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </Box>
        </Box>
      )}
    </>
  );
};

export default GroupedProcesses;
