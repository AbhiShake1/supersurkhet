import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useState, useRef, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Smartphone, Tablet, Monitor, Maximize, X, Search, Terminal, Eye, EyeOff, MessageSquare, MessageSquareX, Code, CopyIcon, GlobeIcon, RefreshCcwIcon, Sparkles } from 'lucide-react';
import { CopyPromptButton } from '@/components/ui/ui-builder/copy-prompt-button';
import { zodToJsonSchema } from '@/lib/zod/zod-to-json-schema';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import MonacoEditor from '@monaco-editor/react';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { uiBuilderLayerSchema } from '@/lib/schemas/ui-builder-schema';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useContextData } from '@/lib/ui-builder/context/context-data-store';
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';


const componentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};

export const Route = createFileRoute('/$businessName/admin/editor')({
  validateSearch: z.object({
    layout: z.enum(['vertical', 'horizontal']).optional().default('horizontal'),
    previewMode: z.enum(['mobile', 'tablet', 'desktop', 'responsive']).optional().default('responsive'),
  }),
  component: EditorComponent,
});

function EditorComponent() {
  const { businessName } = Route.useParams();
  const { data: business, isLoading } = api.business.useGet({ keys: [businessName], single: true })
  const _business = business?.[0]
  const code = _business?.uiBuilder?.layers ?? ''
  const { mutate: update } = api.business.useUpdate()
  function setCode(newCode: string) {
    try {
      // pre-save validations so there is no bad commit
      const parsed = JSON.parse(newCode)
      uiBuilderLayerSchema.array().parse(parsed)

      update({
        id: businessName,
        uiBuilder: {
          layers: newCode ?? ""
        }
      })
    } catch { }
  }
  const { layout, previewMode } = Route.useSearch();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [selectedPreviewMode, setSelectedPreviewMode] = useState<'mobile' | 'tablet' | 'desktop' | 'responsive'>(
    previewMode
  );
  const initialContextData = useContextData();

  // AI Chat related states and logic
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>('google/gemini-pro');

  // Define a schema for our UI builder based on the Zod schema from ui-builder-schema.ts
  // Converting Zod schema to JSON schema format for Monaco Editor
  const rootSchema = {
    $defs: {
      UiBuilderComponent: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for the component' },
          name: { type: 'string', description: 'Component name for identification (use same as type if not specified)' },
          type: {
            type: 'string',
            description: 'Component type based on registry',
            enum: Object.keys({
              ...primitiveComponentDefinitions,
              ...complexComponentDefinitions,
            })
          },
          props: {
            type: 'object',
            description: 'Component properties and attributes (always include even if empty)',
            additionalProperties: true,
          },
          children: {
            anyOf: [
              { type: 'string', description: 'Child as string' },
              {
                type: 'array',
                description: 'Array of children - each can be a string or nested components',
                items: { $ref: '#/$defs/UiBuilderComponent' }
              }
            ]
          },
        },
        required: ['id', 'type', 'name', 'props', 'children'],
      }
    },
    type: 'array',
    description: 'Array of UI builder components/pages',
    items: { $ref: '#/$defs/UiBuilderComponent' }
  };

  // Generate comprehensive system prompt for AI
  function generateSystemPrompt() {
    // Create compact summaries of component schemas
    const componentSummaries = Object.entries(componentRegistry).map(([key, component]) => {
      const summary = {
        type: key,
        required: [] as string[],
        optional: [] as string[],
        types: {} as Record<string, string>
      };

      if (component.schema) {
        const jsonSchema = zodToJsonSchema(component.schema);
        if (jsonSchema.properties) {
          Object.entries(jsonSchema.properties).forEach(([propName, propSchema]) => {
            const isRequired = jsonSchema.required?.includes(propName);
            summary.types[propName] = (propSchema as any).type || 'any';

            if (isRequired) {
              summary.required.push(propName);
            } else {
              summary.optional.push(propName);
            }
          });
        }
      }

      return summary;
    });

    return `You are an expert UI developer working with a UI builder system. Your task is to generate UI configurations in JSON format for the UI builder. Focus specifically on creating UI elements that serve the core business functions of the specified business type.

# System Overview
- The UI builder creates interfaces using a JSON structure with nested components
- Output must be valid JSON in the specified format

# Business Context:
- Business Name: ${businessName}
- Business Type: ${_business?.businessType || 'Not specified'}
- Business Description: ${_business?.description || 'Not specified'}
- Business Industry: ${_business?.businessType || 'Not specified'}
- Business Slug: ${businessName}

# Root Schema Definition:
${JSON.stringify(rootSchema, null, 2)}

# Component Types Available:
Total: ${Object.keys(componentRegistry).length} components

## Component Type Summaries:
${JSON.stringify(componentSummaries, null, 2)}

# Component Structure:
{
  "id": "unique-identifier",
  "name": "component-name-for-identification",
  "type": "component-type-from-registry",
  "props": {
    // component-specific properties based on the summaries above (ALWAYS include even if empty: {})
  },
  "children": [
    // nested components or text content (ALWAYS include even if empty: [])
  ]
}

# Important Guidelines:
1. Always include a unique "id" for each component
2. Always include a "name" for each component (use same value as "type" if not specified, or create a descriptive name)
3. Always include "props" for each component (even if empty: {})
4. Always include "children" for each component (even if empty: [])
5. Use "type" that exactly matches one of the available component types
6. Provide "props" based on the component summaries above (required/optional fields)
7. Nest components using the "children" array
8. Include text content as string values in the children array
9. Ensure the entire structure is a valid JSON array at the root level
10. Use proper nesting to create the intended UI hierarchy

# Design Principles:
- Apply consistent padding and spacing (use Tailwind classes like p-4, m-4, space-y-4, space-x-4, py-6, px-4, etc.)
- For flex layouts, always include adequate spacing between elements using space-x-* and space-y-* classes
- Create sleek, modern designs without overdoing it
- Use appropriate color schemes and ensure good contrast
- Follow accessibility best practices (aria labels, semantic HTML)
- Maintain responsive design principles
- Use consistent typography hierarchy
- Consider visual balance and white space
- Follow mobile-first design approach (prioritize mobile experience, then enhance for larger screens)
- Optimize for touch interactions (adequate touch targets: min 44px, swipe gestures where appropriate)
- Ensure fast loading interfaces (avoid heavy components on mobile)
- Use familiar UI patterns that mobile users expect
- Support both light and dark modes using Tailwind's dark: modifier (e.g., text-gray-800 dark:text-gray-200)

# Business-Specific Guidelines:
- Create UI components that are specifically focused on the business type: ${_business?.businessType || 'unspecified'}
- Align design with business description: ${_business?.description || 'unspecified'}
- Design primarily for the core workflows of ${_business?.businessType || 'unspecified'} industry
- Focus your UI design on the core business functions (e.g., if it's a restaurant, prioritize menu display, ordering, table booking)
- Use appropriate colors and styling that align with the ${_business?.businessType || 'unspecified'} industry
- Prioritize mobile experience since this is a client-side mobile-first application
- Design interfaces that are intuitive for mobile users of ${_business?.businessType || 'unspecified'} services
- Consider common business workflows for ${_business?.businessType || 'unspecified'} industry
- Ensure adequate spacing in layouts to create a clean, uncluttered appearance on mobile screens

# Spacing & Layout Guidelines:
- Always use generous spacing: apply p-4, py-6, px-4, space-y-6, space-x-4 or similar spacing classes
- In flex containers, use space-x-* and space-y-* classes to create proper element separation
- For mobile layouts, apply at least 16px (p-4) of padding around content
- Use mb-4, mt-6, my-8, mx-4 for consistent vertical and horizontal spacing
- Ensure that elements in flex layouts have adequate spacing (min 12-16px between elements)
- Use flex gap: gap-4, gap-6, gap-8 for consistent spacing in flex/grid layouts

# Scrolling & Image Guidelines:
- Ensure UI is properly scrollable by avoiding height constraints that block scrolling (avoid h-screen, h-full, etc. unless necessary)
- Use overflow-y-auto, overflow-y-scroll, or max-h-* with overflow-y-auto for scrollable containers
- For scrollable lists or grids, ensure they allow natural scrolling behavior
- Only use valid image links - use placeholder services like https://placehold.co/ or https://picsum.photos/ or https://images.unsplash.com/
- Do NOT include broken image links or generic image URLs that may fail
- For production, ensure images are optimized for web delivery

# UI/UX Excellence Guidelines:
- Create UIs that are incredibly appealing with modern design aesthetics
- Ensure the interface is easy to use with intuitive navigation and controls
- Design for the best possible user experience with clear visual hierarchy
- Use consistent and meaningful animations/transitions where appropriate
- Ensure accessibility with proper contrast ratios and semantic structure
- Create layouts that are visually striking and memorable to end users
- Prioritize content discoverability and ease of interaction
- Make the UI feel responsive and delightful to interact with
- Implement proper dark mode support using Tailwind's dark: modifier for all UI elements (text, backgrounds, borders, etc.)

# Data-Aware Components:
This system includes special data-aware components that can fetch and display business data:
- DataList: Displays a list of items from a database table (use with table prop)
- DataDetail: Displays details for a specific item (requires dataId and table props)
- SingleData: Represents an individual data item within a list
- ProductList: Displays a list of products
- ProductDetail: Displays details for a specific product (requires productId)
- SingleProduct: Represents an individual product within a list
- ProductImage, ProductTitle, ProductDescription, ProductPrice, etc.: Product-specific display components

# Context-Aware Data Binding:
The system supports context-aware data binding using special syntax. The following values are populated at runtime from the useContextData hook: ${JSON.stringify(initialContextData)}

- Use @context.user.name to access user information (available globally)
- Use @context.business.name to access business information (available globally)
- Use @context.product.fieldName for product information, but this is only available when inside ProductList/SingleProduct context
- Use @context.data.fieldName for data information, but this is only available when inside DataList/SingleData context

The context values depend on the component context:
- Inside ProductList > SingleProduct components: @context.product.* fields are available
- Inside DataList > SingleData components: @context.data.* fields are available
- Global contexts (@context.user.*, @context.business.*) are available everywhere

Important: Any string prop can contain @ mentions, and their values will be resolved at render-time. This means you can use @context variables in any string property, not just in specific contexts.

# Example:
[
  {
    "id": "main-container",
    "name": "main-container",
    "type": "div",
    "props": {
      "className": "container mx-auto p-4 space-y-6 bg-white dark:bg-gray-900"
    },
    "children": [
      {
        "id": "header",
        "name": "page-header",
        "type": "h1",
        "props": {
          "className": "text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white"
        },
        "children": "Welcome to @context.business.name"
      },
      {
        "id": "content-section",
        "name": "content-section",
        "type": "ProductList",
        "props": {
          "table": "product",
          "className": "space-y-6"
        },
        "children": [
          {
            "id": "product-card",
            "name": "product-card",
            "type": "SingleProduct",
            "props": {
              "className": "space-y-3"
            },
            "children": [
              {
                "id": "product-image",
                "name": "product-image",
                "type": "ProductImage",
                "props": {
                  "className": "rounded-lg",
                  "alt": "@context.product.title image"
                },
                "children": []
              },
              {
                "id": "product-title",
                "name": "product-title",
                "type": "ProductTitle",
                "props": {
                  "className": "text-lg font-semibold text-gray-900 dark:text-white"
                },
                "children": "@context.product.title"
              },
              {
                "id": "product-description",
                "name": "product-description",
                "type": "ProductDescription",
                "props": {
                  "className": "text-sm text-gray-600 dark:text-gray-300"
                },
                "children": "@context.product.description"
              },
              {
                "id": "product-price",
                "name": "product-price",
                "type": "ProductPrice",
                "props": {
                  "className": "text-lg font-bold text-primary"
                },
                "children": "Rs. @context.product.price"
              }
            ]
          }
        ]
      }
    ]
  }
]

Provide the complete UI configuration in JSON format as your response. Do not include any additional text or explanations outside of the JSON structure.`;
  };

  const [webSearch, setWebSearch] = useState(false);
  const { messages, sendMessage, status, regenerate } = useChat({
    api: '/api/chat',
    body: {
      businessName,
      businessType: _business?.businessType || '',
      businessDescription: _business?.description || '',
    },
    initialMessages: [
      {
        id: 'initial-prompt',
        role: 'system',
        content: generateSystemPrompt(),
      }
    ],
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Available models
  const models = [
    {
      name: 'Gemini Pro',
      value: 'google/gemini-pro',
    },
    {
      name: 'Gemini Flash',
      value: 'google/gemini-flash',
    },
  ];

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);

  const [monacoInstance, setMonacoInstance] = useState<typeof import('monaco-editor') | null>(null);
  const [vimMode, setVimMode] = useState(false);

  const handleEditorDidMount = (editor: import('monaco-editor').editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;
    setMonacoInstance(monaco);

    // Register the JSON schema for validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'ui-builder-schema',
        fileMatch: ['*'], // Apply to all files for this demo
        schema: rootSchema
      }]
    });

    // Add custom keybindings if needed
    // Example: Add a keybinding for formatting JSON
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, // Cmd/Ctrl+F for format
      () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Set up vim mode if enabled
    // Note: In a real implementation, we would need to install and import the vim mode extension
    // For now, we'll update the editor options when vimMode changes
    // editor.updateOptions({ vimMode: vimMode });
  };

  // Handle code formatting
  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  // Handle search
  const showSearch = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('any', 'actions.find', {});
    }
  }, []);

  // Get selected text

  // Grab code from chat (this is a simulation since we can't directly access iframe content due to CORS)
  const grabCodeFromChat = useCallback(() => {
    // In a real implementation, we would need to set up message communication with the iframe
    // For now, we'll just show a notification to demonstrate the functionality
    alert('In a real implementation, this would grab the latest code block from the AI chat');

    // This is where we would implement the postMessage communication with the iframe
    // to extract code blocks from the AI response
  }, []);

  // Send selected text from iframe to editor
  const sendSelectedToEditor = useCallback(() => {
    // Since we can't directly access iframe content due to CORS,
    // we'll use a workaround: prompt the user to copy the text first
    const selectedText = prompt('Please copy the text from the AI chat and paste it here:');
    if (selectedText) {
      if (editorRef.current && monacoInstance) {
        // Get the current position of the cursor
        const currentPosition = editorRef.current.getPosition();

        // Create a model edit operation to insert the text
        const model = editorRef.current.getModel();
        if (model && currentPosition) {
          // Insert at current cursor position
          model.pushEditOperations(
            [], // Don't push to undo stack for now
            [{
              range: new monacoInstance.Range(
                currentPosition.lineNumber,
                currentPosition.column,
                currentPosition.lineNumber,
                currentPosition.column
              ),
              text: selectedText,
              forceMoveMarkers: true
            }],
            () => null // Don't return a selection
          );

          // Show a confirmation
          console.log('Text inserted into editor:', selectedText);
        }
      }
    }

    // In a real implementation, we would use postMessage to communicate with the iframe
    // and get the selected text directly from there
  }, [monacoInstance]);

  // Toggle vim mode
  const toggleVimMode = useCallback(() => {
    setVimMode(prev => {
      const newVimMode = !prev;
      if (editorRef.current && monacoInstance) {
        // Toggle vim mode in the editor
        // This requires importing the vim mode extension which needs to be installed separately
        // In a real implementation, this would be something like:
        // import * as monacoVim from 'monaco-vim';
        // and then call monacoVim.initVimMode(editor, statusBarItem);
        console.log('Vim mode toggle:', newVimMode);
        // For now, we're just setting the state which will update the button appearance
        // The actual vim mode implementation would require installing and configuring the vim mode extension
      }
      return newVimMode;
    });
  }, [monacoInstance]);

  // Insert text at cursor position in editor

  if (isLoading) return <Spinner />

  const currentLayers = _business?.uiBuilder?.layers
  function tryParse(str: string) {
    try {
      return JSON.parse(str)
    } catch { }
  }
  const currentPage = currentLayers ? tryParse(currentLayers)?.[0] : undefined;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <div className="p-4 border-b bg-background flex items-center justify-between" style={{ zIndex: 10 }}>
        <h1 className="text-xl font-bold">UI Builder Editor - {businessName}</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Preview Mode Selector */}
          <div className="flex items-center border rounded-md ml-2">
            <Button
              variant={selectedPreviewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedPreviewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPreviewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedPreviewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedPreviewMode === 'responsive' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPreviewMode('responsive')}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                className="ml-2"
              >
                {isPreviewVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPreviewVisible ? "Hide Preview" : "Show Preview"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAIChatVisible(!isAIChatVisible)}
                className="ml-2"
              >
                {isAIChatVisible ? <MessageSquareX className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAIChatVisible ? "Hide AI Chat" : "Show AI Chat"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isPreviewVisible ? (
        <ResizablePanelGroup
          direction={layout === 'horizontal' ? 'horizontal' : 'vertical'}
          className="flex-1"
        >
          {/* Main Editor and Preview Area */}
          <ResizablePanel defaultSize={isAIChatVisible ? 70 : 100} minSize={30}>
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full"
            >
              {/* Code Editor Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full w-full p-2">
                  <div className="h-full w-full flex flex-col">
                    <div className="flex items-center gap-2 p-2 border-b" style={{ zIndex: 5 }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={formatCode}>
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Format Code</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={showSearch}>
                            <Search className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Search/Replace</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={vimMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={toggleVimMode}
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {vimMode ? "Disable Vim Mode" : "Enable Vim Mode"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CopyPromptButton onGeneratePrompt={generateSystemPrompt} />
                        </TooltipTrigger>
                        <TooltipContent>Copy AI Prompt</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <MonacoEditor
                        height="100%"
                        language="json"
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        onMount={handleEditorDidMount}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: true },
                          fontSize: 14,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          folding: true,
                          renderLineHighlight: 'all',
                          quickSuggestions: true,
                          // parameterHints: true,
                          suggestOnTriggerCharacters: true,
                          acceptSuggestionOnCommitCharacter: true,
                          acceptSuggestionOnEnter: 'on',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Preview Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full w-full p-4 bg-muted/50 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Preview</h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsPreviewVisible(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className={`flex-1 overflow-auto ${selectedPreviewMode === 'mobile' ? 'max-w-xs mx-auto border' : selectedPreviewMode === 'tablet' ? 'max-w-md mx-auto border' : ''}`}>
                    {
                      currentPage ?
                        <LayerRenderer
                          className="w-full h-full"
                          page={currentPage}
                          componentRegistry={componentRegistry}
                        /> : "Something went wrong"
                    }
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {isAIChatVisible && (
            <>
              <ResizableHandle withHandle />
              {/* AI Chat Area */}
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full w-full border-l bg-background flex flex-col">
                  <div className="p-2 border-b flex items-center justify-between" style={{ zIndex: 5 }}>
                    <h3 className="font-semibold flex gap-1 flex-row items-center">
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Builder Agent
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAIChatVisible(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Gemini AI Chat */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 flex flex-col">
                      {/* AI Chat Interface */}
                      <div className="max-w-full mx-auto p-2 relative flex-1 flex flex-col">
                        <div className="flex flex-col flex-1">
                          <Conversation className="h-full">
                            <ConversationContent>
                              {messages.map((message) => (
                                <div key={message.id} className="mb-4">
                                  {message.role === 'assistant' && message.content && message.content.length > 0 && (
                                    <Sources>
                                      <SourcesTrigger
                                        count={
                                          Array.isArray(message.content)
                                            ? message.content.filter(
                                              (part: any) => part.type === 'source-url'
                                            ).length
                                            : 0
                                        }
                                      />
                                      {Array.isArray(message.content) &&
                                        message.content
                                          .filter((part: any) => part.type === 'source-url')
                                          .map((part: any, i: number) => (
                                            <SourcesContent key={`${message.id}-${i}`}>
                                              <Source
                                                key={`${message.id}-${i}`}
                                                href={part.url}
                                                title={part.url}
                                              />
                                            </SourcesContent>
                                          ))}
                                    </Sources>
                                  )}
                                  {message.content && (
                                    typeof message.content === 'string' ? (
                                      <Message from={message.role}>
                                        <MessageContent>
                                          <MessageResponse>
                                            {message.content}
                                          </MessageResponse>
                                        </MessageContent>
                                        {message.role === 'assistant' && (
                                          <MessageActions>
                                            <MessageAction
                                              onClick={() => regenerate()}
                                              label="Retry"
                                            >
                                              <RefreshCcwIcon className="size-3" />
                                            </MessageAction>
                                            <MessageAction
                                              onClick={() =>
                                                navigator.clipboard.writeText(message.content)
                                              }
                                              label="Copy"
                                            >
                                              <CopyIcon className="size-3" />
                                            </MessageAction>
                                          </MessageActions>
                                        )}
                                      </Message>
                                    ) : Array.isArray(message.content) ? (
                                      message.content.map((part: any, i: number) => {
                                        switch (part.type) {
                                          case 'text':
                                            return (
                                              <Message key={`${message.id}-${i}`} from={message.role}>
                                                <MessageContent>
                                                  <MessageResponse>
                                                    {part.text}
                                                  </MessageResponse>
                                                </MessageContent>
                                                {message.role === 'assistant' && (
                                                  <MessageActions>
                                                    <MessageAction
                                                      onClick={() => regenerate()}
                                                      label="Retry"
                                                    >
                                                      <RefreshCcwIcon className="size-3" />
                                                    </MessageAction>
                                                    <MessageAction
                                                      onClick={() =>
                                                        navigator.clipboard.writeText(part.text)
                                                      }
                                                      label="Copy"
                                                    >
                                                      <CopyIcon className="size-3" />
                                                    </MessageAction>
                                                  </MessageActions>
                                                )}
                                              </Message>
                                            );
                                          case 'reasoning':
                                            return (
                                              <Reasoning
                                                key={`${message.id}-${i}`}
                                                className="w-full"
                                                isStreaming={status === 'streaming' && i === message.content.length - 1 && message.id === messages.at(-1)?.id}
                                              >
                                                <ReasoningTrigger />
                                                <ReasoningContent>{part.text}</ReasoningContent>
                                              </Reasoning>
                                            );
                                          default:
                                            return null;
                                        }
                                      })
                                    ) : null
                                  )}
                                </div>
                              ))}
                              {status === 'streaming' && <Loader />}
                            </ConversationContent>
                            <ConversationScrollButton />
                          </Conversation>
                        </div>

                        <PromptInput
                          onSubmit={(message: PromptInputMessage) => {
                            const hasText = Boolean(message.text);
                            const hasAttachments = Boolean(message.files?.length);
                            if (!(hasText || hasAttachments)) {
                              return;
                            }
                            sendMessage(
                              {
                                text: message.text || 'Sent with attachments',
                                files: message.files
                              },
                              {
                                body: {
                                  model: model,
                                  webSearch: webSearch,
                                },
                              },
                            );
                            setInput('');
                          }}
                          className="mt-4"
                          globalDrop
                          multiple
                        >
                          <PromptInputHeader>
                            <PromptInputAttachments>
                              {(attachment: any) => <PromptInputAttachment data={attachment} />}
                            </PromptInputAttachments>
                          </PromptInputHeader>
                          <PromptInputBody>
                            <PromptInputTextarea
                              onChange={(e) => setInput(e.target.value)}
                              value={input}
                            />
                          </PromptInputBody>
                          <PromptInputFooter>
                            <PromptInputTools>
                              <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger />
                                <PromptInputActionMenuContent>
                                  <PromptInputActionAddAttachments />
                                </PromptInputActionMenuContent>
                              </PromptInputActionMenu>
                              <PromptInputButton
                                variant={webSearch ? 'default' : 'ghost'}
                                onClick={() => setWebSearch(!webSearch)}
                              >
                                <GlobeIcon size={16} />
                                <span>Search</span>
                              </PromptInputButton>
                              <PromptInputSelect
                                onValueChange={(value) => {
                                  setModel(value);
                                }}
                                value={model}
                              >
                                <PromptInputSelectTrigger>
                                  <PromptInputSelectValue />
                                </PromptInputSelectTrigger>
                                <PromptInputSelectContent>
                                  {models.map((model) => (
                                    <PromptInputSelectItem key={model.value} value={model.value}>
                                      {model.name}
                                    </PromptInputSelectItem>
                                  ))}
                                </PromptInputSelectContent>
                              </PromptInputSelect>
                            </PromptInputTools>
                            <PromptInputSubmit disabled={!input && !status} status={status} />
                          </PromptInputFooter>
                        </PromptInput>
                      </div>

                      {/* Code interaction buttons (replacing iframe buttons) */}
                      <div className="p-2 border-t flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Logic to insert generated code into editor
                            if (messages.length > 0) {
                              const lastMessage = messages[messages.length - 1];
                              if (lastMessage.role === 'assistant' && lastMessage.content) {
                                const content = typeof lastMessage.content === 'string'
                                  ? lastMessage.content
                                  : lastMessage.content.find((part: any) => part.type === 'text')?.text || '';

                                // Attempt to parse the content as JSON to see if it's valid UI config
                                try {
                                  const parsed = JSON.parse(content);
                                  // If it's valid JSON, update the code
                                  setCode(JSON.stringify(parsed, null, 2));
                                } catch {
                                  // If it's not valid JSON, show as text in the editor
                                  if (editorRef.current) {
                                    const model = editorRef.current.getModel();
                                    if (model) {
                                      model.setValue(content);
                                    }
                                  }
                                }
                              }
                            }
                          }}
                        >
                          Insert Code
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        // Full editor view when preview is hidden - ensure editor has proper height
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-2 min-h-[300px]">
            <div className="h-full w-full flex flex-col min-h-[250px]">
              <div className="flex items-center gap-2 p-2 border-b" style={{ zIndex: 5 }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={formatCode}>
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Format Code</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={showSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search/Replace</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={vimMode ? "secondary" : "outline"}
                      size="sm"
                      onClick={toggleVimMode}
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {vimMode ? "Disable Vim Mode" : "Enable Vim Mode"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <CopyPromptButton onGeneratePrompt={generateSystemPrompt} />
                  </TooltipTrigger>
                  <TooltipContent>Copy AI Prompt</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-hidden min-h-[200px]">
                  <MonacoEditor
                    height="100%"
                    language="json"
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      folding: true,
                      renderLineHighlight: 'all',
                      quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true
                      },
                      // parameterHints: true,
                      suggestOnTriggerCharacters: true,
                      acceptSuggestionOnCommitCharacter: true,
                      acceptSuggestionOnEnter: 'on',
                      // Add custom snippets
                      snippetSuggestions: 'top',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
