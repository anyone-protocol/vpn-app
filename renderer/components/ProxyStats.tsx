import React, { useState, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";

interface ProxyStatsProps {
  proxyRunning: boolean;
}

const ProxyStats: React.FC<ProxyStatsProps> = ({ proxyRunning }) => {
  const [download, setDownload] = useState<string>("0 B");
  const [upload, setUpload] = useState<string>("0 B");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ipc && proxyRunning) {
      const removeProxyStatsListener = window.ipc.onProxyStats(
        (stats: { download: string; upload: string }) => {
          console.log("Received proxy stats:", stats);
          setDownload(stats.download);
          setUpload(stats.upload);
        }
      );

      // Cleanup listener on unmount
      return () => {
        removeProxyStatsListener();
      };
    }
  }, [proxyRunning]);

  return (
    <Box textAlign="center" mt={4}>
      <Text fontSize="md">
        Download: <strong>{download}</strong>
      </Text>
      <Text fontSize="md">
        Upload: <strong>{upload}</strong>
      </Text>
    </Box>
  );
};

export default ProxyStats;
