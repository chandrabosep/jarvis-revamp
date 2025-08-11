import { ColumnDef, flexRender, Table as ReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table-components';
import { Skeleton } from './skeleton';

interface DataTableProps<T> {
    table: ReactTable<T>;
    columns: ColumnDef<T>[];
    isLoading: boolean;
}

function DataTable<T>({ table, columns, isLoading }: DataTableProps<T>) {
    return (
        <div className="border-[1.5px] rounded-lg overflow-hidden">
            <div className="max-h-[calc(100svh-14rem)] overflow-y-auto">
                <Table className="rounded-lg overflow-hidden">
                    <TableHeader className="bg-primaryColor/5 sticky top-0">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="!font-extrabold py-5">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <>
                                {[...Array(10)].map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell colSpan={columns.length}>
                                            <Skeleton className="w-full h-8" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        ) : table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default DataTable;
