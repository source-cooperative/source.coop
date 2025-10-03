import { ChevronDownIcon } from "@radix-ui/react-icons";

export function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <ChevronDownIcon
      style={{
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.3s ease",
      }}
      data-state={isOpen ? "open" : "closed"}
    />
  );
}
