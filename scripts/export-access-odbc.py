import sys
import pyodbc
import os

def export_to_access(excel_path, access_path, table_name, sheet_name):
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found: {excel_path}")
        sys.exit(1)
    if not os.path.exists(access_path):
        print(f"Error: Access DB not found: {access_path}")
        sys.exit(1)

    # ODBC Connection String
    conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={access_path};"
    )

    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        print(f"Connected to Access: {access_path}")

        # 1. Drop table if exists
        try:
            cursor.execute(f"DROP TABLE [{table_name}]")
            print(f"Table [{table_name}] dropped.")
        except pyodbc.Error:
            print(f"Table [{table_name}] did not exist or could not be dropped.")

        # 2. Execute SELECT INTO from Excel
        # Syntax: SELECT * INTO [Table] FROM [Excel 12.0 Xml;HDR=YES;Database=Path].[Sheet$]
        
        # Ensure sheet name ends with $ if not provided
        if not sheet_name.endswith('$'):
            sheet_ref = f"{sheet_name}$"
        else:
            sheet_ref = sheet_name

        sql = (
            f"SELECT * INTO [{table_name}] "
            f"FROM [Excel 12.0 Xml;HDR=YES;Database={excel_path}].[{sheet_ref}]"
        )
        
        print("Executing import query...")
        cursor.execute(sql)
        print(f"Successfully imported data into [{table_name}].")
        
        cursor.close()
        conn.close()

    except pyodbc.Error as e:
        print(f"ODBC Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python export-access-odbc.py <ExcelPath> <AccessPath> <TableName> [SheetName]")
        sys.exit(1)
    
    excel_path = sys.argv[1]
    access_path = sys.argv[2]
    table_name = sys.argv[3]
    sheet_name = sys.argv[4] if len(sys.argv) > 4 else "Sheet1"

    export_to_access(excel_path, access_path, table_name, sheet_name)
