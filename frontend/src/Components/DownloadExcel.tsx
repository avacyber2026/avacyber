"use client";

import { Workbook } from "exceljs";
import { saveAs } from "file-saver";
import { Button } from "@/ui";
import { motion } from "framer-motion";
import type { Ticket } from "@/types";

interface ButtonDownloadExcelProps {
  data: Ticket[];
  label?: string;
}

export function ButtonDownloadExcel({ data, label = "Download history" }: ButtonDownloadExcelProps) {
  const handleDownload = async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Sheet1");

    const hasExtended = data.length > 0 && ("createdAt" in data[0]! || "createdBy" in data[0]!);
    const headers = hasExtended
      ? ["id", "Subject", "Description", "Status", "Priority", "Created By", "Assigned To", "Type", "Created At"]
      : ["id", "Subject", "Description", "Status", "Priority", "GSOC", "Type"];

    sheet.addRow(headers);

    data.forEach((item) => {
      if (hasExtended && "createdAt" in item) {
        sheet.addRow([
          item.id,
          item.title,
          item.text,
          item.status,
          item.priority,
          item.createdBy ?? "",
          item.assignedTo ?? item.fromUser,
          item.type,
          item.createdAt ?? "",
        ]);
      } else {
        sheet.addRow([item.id, item.title, item.text, item.status, item.priority, item.fromUser, item.type]);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "History.xlsx");
  };

  return (
    <Button
      as={motion.button}
      onClick={handleDownload}
      className="bg-brand-primary text-white w-[250px] hover:bg-brand-primaryDark rounded-[15px]"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
    </Button>
  );
}
