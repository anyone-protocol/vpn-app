import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";

export interface Rule {
  id: string;
  title: string;
  destinations: string[];
  hops: number;
  entryCountries: string[];
  exitCountries: string[];
}

interface RuleBoxProps {
  rule: Rule;
  headerBgColor: string;
  deleteProxyRule: (ruleId: string) => void;
  editProxyRule: (rule: Rule) => void;
}

export const RuleBox: React.FC<RuleBoxProps> = ({ rule, headerBgColor, deleteProxyRule, editProxyRule }) => {
  return (
    <Box
      border="1px solid"
      borderColor="gray.600"
      borderRadius="md"
      p={4}
      bg="rgba(24, 24, 27, 0.70)"
      backdropFilter="blur(4px)"
      w="100%"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text color={headerBgColor} fontWeight="500">
          {rule.title}
        </Text>
        <HStack spacing={2}>
          <Button size="sm" colorScheme="blue" variant="ghost" onClick={() => editProxyRule(rule)}>
            Edit
          </Button>
          <Button size="sm" colorScheme="red" variant="ghost" onClick={() => deleteProxyRule(rule.id)}>
            Delete
          </Button>
        </HStack>
      </Flex>

      <VStack align="stretch" spacing={2}>
        <Box>
          <Text fontSize="xs" color="gray.400">Destinations:</Text>
          <Text fontSize="sm" color="white">{rule.destinations.join(', ')}</Text>
        </Box>
        
        <Box>
          <Text fontSize="xs" color="gray.400">Hops:</Text>
          <Text fontSize="sm" color="white">{rule.hops}</Text>
        </Box>

        <Box>
          <Text fontSize="xs" color="gray.400">Entry Countries:</Text>
          <Text fontSize="sm" color="white">{rule.entryCountries.join(', ')}</Text>
        </Box>

        <Box>
          <Text fontSize="xs" color="gray.400">Exit Countries:</Text>
          <Text fontSize="sm" color="white">{rule.exitCountries.join(', ')}</Text>
        </Box>
      </VStack>
    </Box>
  );
}; 