import { Tool } from "@/types/editor";

const getCursor = (tool: Tool) => {
  switch (tool) {
    case "hand":
      return "grab";
    case "pen":
    case "brush":
      return "crosshair";
    case "eraser":
      return "cell";
    case "select":
      return "default";
    case "ai":
      return "none";
    case "text":
      return "text";
    default:
      return "crosshair";
  }
};

export { getCursor };
