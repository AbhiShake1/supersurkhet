import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useState, useRef, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon, Smartphone, Tablet, Monitor, Maximize, X, Search, Terminal, Eye, EyeOff, MessageSquare, MessageSquareX, Code } from 'lucide-react';
import { useTheme } from 'next-themes';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import MonacoEditor from '@monaco-editor/react';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpenAI } from '@/components/ui/svgs';
import { ClaudeAI } from '@/components/ui/svgs';
import { Gemini } from '@/components/ui/svgs';
import { DeepSeek } from '@/components/ui/svgs';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { uiBuilderLayerSchema } from '@/lib/schemas/ui-builder-schema';


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
  function hasSyntaxErrors(): boolean {
    if (!monacoInstance || !editorRef.current) return true;

    const model = editorRef.current.getModel();
    if (!model) return true;

    const markers = monacoInstance.editor.getModelMarkers({
      resource: model.uri,
    });

    return markers.some(
      (m: any) => m.severity === monacoInstance.MarkerSeverity.Error
    );
  }
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
  const { setTheme } = useTheme();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const [selectedPreviewMode, setSelectedPreviewMode] = useState<'mobile' | 'tablet' | 'desktop' | 'responsive'>(
    previewMode
  );
  const [selectedAIService, setSelectedAIService] = useState<string>('chatgpt');
  const [showContextPanel, setShowContextPanel] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const aiServices = [
    { id: 'chatgpt', name: <OpenAI className="size-4" />, url: 'https://chat.openai.com' },
    { id: 'claude', name: <ClaudeAI className="size-4" />, url: 'https://claude.ai' },
    { id: 'gemini', name: <Gemini className="size-4" />, url: 'https://gemini.google.com' },
    { id: 'deepseek', name: <DeepSeek className="size-4" />, url: 'https://www.deepseek.com' },
  ];

  const editorRef = useRef<any>(null);

  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [vimMode, setVimMode] = useState(false);

  // Define a schema for our UI builder based on the Zod schema from ui-builder-schema.ts
  // Converting Zod schema to JSON schema format for Monaco Editor
  const rootSchema = {
    $defs: {
      UiBuilderComponent: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for the component' },
          name: { type: 'string', description: 'Optional component name for identification' },
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
            description: 'Component properties and attributes',
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
        required: ['id', 'type'],
      }
    },
    type: 'array',
    description: 'Array of UI builder components/pages',
    items: { $ref: '#/$defs/UiBuilderComponent' }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
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
        editor.getAction('editor.action.formatDocument').run();
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
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  // Handle search
  const showSearch = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('any', 'actions.find', {});
    }
  }, []);

  // Get selected text
  const getSelectedText = useCallback(() => {
    if (editorRef.current) {
      return editorRef.current.getModel().getValueInRange(
        editorRef.current.getSelection()
      );
    }
    return '';
  }, []);

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
  const insertTextAtCursor = useCallback((text: string) => {
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
            text: text,
            forceMoveMarkers: true
          }],
          () => null // Don't return a selection
        );
      }
    }
  }, [monacoInstance]);

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
          <Button variant="outline" size="icon" onClick={() => setTheme('light')}>
            <SunIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setTheme('dark')}>
            <MoonIcon className="h-4 w-4" />
          </Button>

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
                          parameterHints: true,
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
                    <h3 className="font-semibold">AI Assistant</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAIChatVisible(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* AI Service Tabs */}
                  <div className="flex border-b">
                    {aiServices.map((service) => (
                      <Button
                        key={service.id}
                        variant={selectedAIService === service.id ? 'secondary' : 'ghost'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedAIService(service.id)}
                      >
                        {service.name}
                      </Button>
                    ))}
                  </div>

                  {/* Selected AI Service Chat */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {selectedAIService && (
                      <div className="relative flex-1">
                        <iframe
                          ref={iframeRef}
                          src={aiServices.find(s => s.id === selectedAIService)?.url}
                          className="w-full h-full"
                          title={`${aiServices.find(s => s.id === selectedAIService)?.name} Chat`}
                        />

                        {/* Overlay with buttons */}
                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={grabCodeFromChat}
                          >
                            Grab Code
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={sendSelectedToEditor}
                          >
                            Send Selected
                          </Button>
                        </div>
                      </div>
                    )}
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
                      quickSuggestions: true,
                      parameterHints: true,
                      suggestOnTriggerCharacters: true,
                      acceptSuggestionOnCommitCharacter: true,
                      acceptSuggestionOnEnter: 'on',
                      // Enable custom completion items
                      quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true
                      },
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
