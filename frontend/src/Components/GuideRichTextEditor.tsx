"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import type React from "react";
import { forwardRef, useImperativeHandle } from "react";
import styles from "@/styles/GuideTiptapEditor.module.css";

export type GuideEditorHandle = {
  insertHtml: (html: string) => void;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

function TlBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`${styles.tlBtn} ${active ? styles.tlBtnActive : ""}`}>
      {children}
    </button>
  );
}

export const GuideRichTextEditor = forwardRef<GuideEditorHandle, Props>(function GuideRichTextEditor(
  { value, onChange, className },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
      }),
    ],
    content: value?.trim() ? value : "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.proseMirror,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      insertHtml(html: string) {
        editor?.chain().focus().insertContent(html).run();
      },
    }),
    [editor]
  );

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = typeof window !== "undefined" ? window.prompt("URL", prev || "https://") : null;
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function clearFormatting() {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }

  if (!editor) {
    return <div className={`${styles.skeleton} ${className ?? ""}`} />;
  }

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <div className={styles.toolbar}>
        <TlBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          H1
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          H2
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          H3
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          B
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          I
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          U
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
          S
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          • List
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          1. List
        </TlBtn>
        <TlBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          “”
        </TlBtn>
        <TlBtn onClick={setLink} active={editor.isActive("link")}>
          Link
        </TlBtn>
        <TlBtn onClick={clearFormatting}>Clear</TlBtn>
      </div>
      <div className={styles.editorArea}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
