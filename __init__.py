from .prompt_processor import PromptProcessorNode

NODE_CLASS_MAPPINGS = {
    "PromptProcessorNode": PromptProcessorNode
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptProcessorNode": "提示词修改大师"
}

WEB_DIRECTORY = "./js"

__all__ =["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]