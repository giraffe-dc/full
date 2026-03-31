import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface InventoryItem {
    itemId: string;
    itemName: string;
    unit: string;
    theoreticalQty: number;
    actualQty: number;
    cost: number;
}

interface ExportData {
    inventory: {
        warehouseName: string;
        inventoryType: string;
        date: string;
        items: InventoryItem[];
    };
    history?: {
        _id: string;
        date: string;
        warehouseName: string;
        description: string;
        items: any[];
    };
}

export async function POST(req: NextRequest) {
    try {
        const data: ExportData = await req.json();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // ============================================
        // Sheet 1: Current Inventory (if creating new)
        // ============================================
        if (data.inventory) {
            const inventoryData = [
                ["ІНВЕНТАРИЗАЦІЯ"],
                [`Склад: ${data.inventory.warehouseName}`],
                [`Тип: ${data.inventory.inventoryType === "ingredient" ? "Інгредієнти" : "Товари"}`],
                [`Дата: ${new Date(data.inventory.date).toLocaleDateString("uk-UA")}`],
                [],
                ["№", "Назва", "Од. вим.", "Облік (теор.)", "Факт", "Різниця", "Собівартість (од.)", "Сума розбіжності"],
                ...data.inventory.items.map((item, index) => {
                    const delta = item.actualQty - item.theoreticalQty;
                    const diffSum = delta * item.cost;
                    return [
                        index + 1,
                        item.itemName,
                        item.unit,
                        item.theoreticalQty.toFixed(3),
                        item.actualQty.toFixed(3),
                        delta.toFixed(3),
                        item.cost.toFixed(2),
                        diffSum.toFixed(2),
                    ];
                }),
                [],
                ["ЗАГАЛЬНА СУМА РОЗБІЖНОСТЕЙ:", "", "", "", "", "", "",
                    data.inventory.items.reduce((sum, item) => {
                        const delta = item.actualQty - item.theoreticalQty;
                        return sum + (delta * item.cost);
                    }, 0).toFixed(2)
                ],
            ];

            const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);

            // Set column widths
            wsInventory["!cols"] = [
                { wch: 5 },   // №
                { wch: 40 },  // Назва
                { wch: 10 },  // Од. вим.
                { wch: 15 },  // Облік
                { wch: 15 },  // Факт
                { wch: 15 },  // Різниця
                { wch: 18 },  // Собівартість
                { wch: 20 },  // Сума розбіжності
            ];

            // Style header row
            const range = XLSX.utils.decode_range(wsInventory["!ref"] || "A1:H10");
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "6";
                if (!wsInventory[address]) continue;
                wsInventory[address].s = {
                    font: { bold: true },
                    alignment: { horizontal: "center" },
                };
            }

            // Style total row
            const totalRow = 7 + data.inventory.items.length;
            const totalCellAddress = `H${totalRow}`;
            if (wsInventory[totalCellAddress]) {
                wsInventory[totalCellAddress].s = {
                    font: { bold: true },
                };
            }

            XLSX.utils.book_append_sheet(wb, wsInventory, "Інвентаризація");
        }

        // ============================================
        // Sheet 2: History Details (if viewing history)
        // ============================================
        if (data.history) {
            const historyData = [
                ["ДЕТАЛІ ІНВЕНТАРИЗАЦІЇ"],
                [`Дата: ${new Date(data.history.date).toLocaleDateString("uk-UA")}`],
                [`Склад: ${data.history.warehouseName}`],
                [`Опис: ${data.history.description}`],
                [],
                ["№", "Назва", "Од. вим.", "Облік", "Факт", "Різниця", "Собівартість (од.)", "Сума розбіжності"],
                ...data.history.items.map((item: any, index: number) => {
                    const delta = item.qty || (item.actualQty - item.theoreticalQty);
                    const diffSum = delta * item.cost;
                    return [
                        index + 1,
                        item.itemName,
                        item.unit,
                        item.theoreticalQty?.toFixed(3) || "—",
                        item.actualQty?.toFixed(3) || "—",
                        delta.toFixed(3),
                        item.cost?.toFixed(2) || "0.00",
                        diffSum.toFixed(2),
                    ];
                }),
                [],
                ["ЗАГАЛЬНА СУМА РОЗБІЖНОСТЕЙ:", "", "", "", "", "", "",
                    data.history.items.reduce((sum: number, item: any) => {
                        const delta = item.qty || (item.actualQty - item.theoreticalQty);
                        return sum + (delta * item.cost);
                    }, 0).toFixed(2)
                ],
            ];

            const wsHistory = XLSX.utils.aoa_to_sheet(historyData);

            // Set column widths
            wsHistory["!cols"] = [
                { wch: 5 },   // №
                { wch: 40 },  // Назва
                { wch: 10 },  // Од. вим.
                { wch: 15 },  // Облік
                { wch: 15 },  // Факт
                { wch: 15 },  // Різниця
                { wch: 18 },  // Собівартість
                { wch: 20 },  // Сума розбіжності
            ];

            // Style header row
            const range = XLSX.utils.decode_range(wsHistory["!ref"] || "A1:H10");
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "6";
                if (!wsHistory[address]) continue;
                wsHistory[address].s = {
                    font: { bold: true },
                    alignment: { horizontal: "center" },
                };
            }

            // Style total row
            const totalRow = 7 + data.history.items.length;
            const totalCellAddress = `H${totalRow}`;
            if (wsHistory[totalCellAddress]) {
                wsHistory[totalCellAddress].s = {
                    font: { bold: true },
                };
            }

            XLSX.utils.book_append_sheet(wb, wsHistory, "Деталі");
        }

        // Generate filename based on context
        let filename = "Inventory_Export";
        if (data.inventory) {
            filename = `Inventory_${data.inventory.warehouseName.replace(/[^a-zA-Z0-9]/g, "_")}_${data.inventory.date}`;
        } else if (data.history) {
            filename = `Inventory_History_${new Date(data.history.date).toISOString().split("T")[0]}`;
        }

        // Generate buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as downloadable file
        return new NextResponse(buf, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
            },
        });
    } catch (err) {
        console.error("Export error:", err);
        return NextResponse.json(
            {
                error: "Помилка експорту",
                details: err instanceof Error ? err.message : "Невідома помилка",
            },
            { status: 500 }
        );
    }
}
