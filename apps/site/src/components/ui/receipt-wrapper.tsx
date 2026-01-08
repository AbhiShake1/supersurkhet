"use client"

import { useRef } from "react"
import { InvoiceReceipt } from "./invoice-receipt"
import type { Party, Invoice } from "@/lib/schema"
import type { Product } from "../supersurkhet/products"
import { toast } from "sonner"
import { Button } from "./button"
import { Printer as Print, Download, Share2 } from "lucide-react"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-oklch';

declare global {
  interface HTMLElement {
    print(): void;
  }
}

// Source - https://stackoverflow.com/a
// Posted by Gaurav, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-31, License - CC BY-SA 3.0

if (typeof window !== 'undefined') {
  HTMLElement.prototype.print = print;
  function print() {
    var myframe = document.createElement('IFRAME');
    // @ts-expect-error
    myframe.domain = document.domain;
    myframe.style.position = "absolute";
    myframe.style.top = "-10000px";
    document.body.appendChild(myframe);
    // @ts-expect-error
    myframe.contentDocument.write(this.innerHTML);
    setTimeout(function () {
      myframe.focus();
      // @ts-expect-error
      myframe.contentWindow.print();
      myframe.parentNode?.removeChild(myframe);// remove frame
    }, 3000); // wait for images to load inside iframe
    window.focus();
  }
}

interface ReceiptWrapperProps {
  invoice: Invoice
  party: Party
  productsById: Map<string, Product>
}

export function ReceiptWrapper({ invoice, party, productsById }: ReceiptWrapperProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    receiptRef.current?.print()
  }

  const handleDownload = async () => {
    if (!receiptRef.current) return
    try {
      const canvas = await html2canvas(receiptRef.current, { useCORS: true, scale: 2 }); // higher scale = crisper output
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'px', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(`invoice-${Date.now()}.pdf`);
    } catch (error) {
      toast.error("Failed to download PDF")
      console.error("Download error:", error)
    }
  }

  return (
    <div className="min-h-0">
      {/* Receipt Container */}
      <div className="w-full p-2 md:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h1 className="text-xl md:text-2xl font-bold">
              {invoice.type === "sale" ? "Invoice" : "Purchase Order"}
            </h1>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 bg-transparent">
                <Print className="w-3 h-3" />
                <span className="hidden sm:inline text-xs">Print</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1 bg-transparent">
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline text-xs">PDF</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline text-xs">Share</span>
              </Button>
            </div>
          </div>
          <div ref={receiptRef} className="print-area">
            <InvoiceReceipt
              invoice={invoice}
              party={party}
              productsById={productsById}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
