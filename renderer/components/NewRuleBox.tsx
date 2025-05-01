import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  Textarea,
  Select,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { Rule } from "./RuleBox";

interface NewRuleBoxProps {
  isOpen: boolean;
  onClose: () => void;
  headerBgColor: string;
  onAddRule?: (rule: Omit<Rule, "id">) => void;
  onEditRule?: (rule: Rule) => void;
  currentRule?: Rule;
}

export const NewRuleBox: React.FC<NewRuleBoxProps> = ({
  isOpen,
  onClose,
  headerBgColor,
  onAddRule,
  onEditRule,
  currentRule,
}) => {
  const [title, setTitle] = useState(currentRule?.title || "");
  const [destinations, setDestinations] = useState(currentRule?.destinations.join("\n") || "");
  const [hops, setHops] = useState(currentRule?.hops || 3);
  const [entryCountries, setEntryCountries] = useState(currentRule?.entryCountries.join(",") || "");
  const [exitCountries, setExitCountries] = useState(currentRule?.exitCountries.join(",") || "");

  useEffect(() => {
    if (currentRule) {
      setTitle(currentRule.title);
      setDestinations(currentRule.destinations.join("\n"));
      setHops(currentRule.hops);
      setEntryCountries(currentRule.entryCountries.join(","));
      setExitCountries(currentRule.exitCountries.join(","));
    }
  }, [currentRule]);

  const handleSubmit = () => {
    if (currentRule && onEditRule) {
      onEditRule({
        ...currentRule,
        title,
        destinations: destinations.split("\n").filter(d => d.trim() !== ""),
        hops,
        entryCountries: entryCountries.split(",").map(c => c.trim()).filter(c => c !== ""),
        exitCountries: exitCountries.split(",").map(c => c.trim()).filter(c => c !== ""),
      });
    } else if (onAddRule) {
      onAddRule({
        title,
        destinations: destinations.split("\n").filter(d => d.trim() !== ""),
        hops,
        entryCountries: entryCountries.split(",").map(c => c.trim()).filter(c => c !== ""),
        exitCountries: exitCountries.split(",").map(c => c.trim()).filter(c => c !== ""),
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setDestinations("");
    setHops(3);
    setEntryCountries("");
    setExitCountries("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent
        bg="rgba(24, 24, 27, 0.90)"
        boxShadow="0px 1px 0px 0px rgba(255, 255, 255, 0.08) inset"
        border="1px solid"
        borderColor="gray.600"
      >
        <ModalHeader color={headerBgColor}>{currentRule ? "Edit Rule" : "Add New Rule"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color="gray.300">Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter rule title"
                bg="rgba(24, 24, 27, 0.70)"
                border="1px solid"
                borderColor="gray.600"
                _focus={{
                  borderColor: headerBgColor,
                  boxShadow: `0 0 0 1px ${headerBgColor}`,
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="gray.300">Destinations (one per line)</FormLabel>
              <Textarea
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder="Enter destinations (one per line)"
                minH="100px"
                bg="rgba(24, 24, 27, 0.70)"
                border="1px solid"
                borderColor="gray.600"
                _focus={{
                  borderColor: headerBgColor,
                  boxShadow: `0 0 0 1px ${headerBgColor}`,
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="gray.300">Number of Hops</FormLabel>
              <NumberInput
                value={hops}
                onChange={(_, val) => setHops(val)}
                min={2}
                max={3}
                bg="rgba(24, 24, 27, 0.70)"
              >
                <NumberInputField
                  border="1px solid"
                  borderColor="gray.600"
                  _focus={{
                    borderColor: headerBgColor,
                    boxShadow: `0 0 0 1px ${headerBgColor}`,
                  }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper borderColor="gray.600" />
                  <NumberDecrementStepper borderColor="gray.600" />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel color="gray.300">Entry Countries (comma-separated)</FormLabel>
              <Input
                value={entryCountries}
                onChange={(e) => setEntryCountries(e.target.value)}
                placeholder="US, UK, CA"
                bg="rgba(24, 24, 27, 0.70)"
                border="1px solid"
                borderColor="gray.600"
                _focus={{
                  borderColor: headerBgColor,
                  boxShadow: `0 0 0 1px ${headerBgColor}`,
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="gray.300">Exit Countries (comma-separated)</FormLabel>
              <Input
                value={exitCountries}
                onChange={(e) => setExitCountries(e.target.value)}
                placeholder="FR, DE, NL"
                bg="rgba(24, 24, 27, 0.70)"
                border="1px solid"
                borderColor="gray.600"
                _focus={{
                  borderColor: headerBgColor,
                  boxShadow: `0 0 0 1px ${headerBgColor}`,
                }}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isDisabled={!title || !destinations}
            >
              {currentRule ? "Save Changes" : "Add Rule"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 