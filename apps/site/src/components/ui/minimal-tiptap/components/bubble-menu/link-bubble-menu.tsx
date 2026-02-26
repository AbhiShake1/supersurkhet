import type { Editor } from '@tiptap/react';
import type * as React from 'react';

interface LinkBubbleMenuProps {
  editor: Editor;
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  void editor;

  // TODO: add back
  return null;
  // return (
  //   <BubbleMenu
  //     editor={editor}
  //     shouldShow={shouldShow}
  //     tippyOptions={{
  //       placement: "bottom-start",
  //       onHidden: () => setShowEdit(false),
  //     }}
  //   >
  //     {showEdit ? (
  //       <LinkEditBlock
  //         defaultUrl={linkAttrs.href}
  //         defaultText={selectedText}
  //         defaultIsNewTab={linkAttrs.target === "_blank"}
  //         onSave={onSetLink}
  //         className="w-full min-w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none"
  //       />
  //     ) : (
  //       <LinkPopoverBlock
  //         onClear={onUnsetLink}
  //         url={linkAttrs.href}
  //         onEdit={handleEdit}
  //       />
  //     )}
  //   </BubbleMenu>
  // )
};
