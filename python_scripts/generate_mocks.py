import os

def create_valid_minimal_pdf(filename, label, title, subtitle):
    # Minimal PDF format
    stream_text = (
        "BT\n"
        "/F1 18 Tf\n"
        "50 750 Td\n"
        "(EXHIBITKIT COURTROOM WORKFLOW PREPARATION) Tj\n"
        "0 -45 Td\n"
        "/F1 14 Tf\n"
        f"(Exhibit Label: {label}) Tj\n"
        "0 -25 Td\n"
        f"(Document: {title}) Tj\n"
        "0 -25 Td\n"
        f"(Details: {subtitle}) Tj\n"
        "0 -40 Td\n"
        "/F1 11 Tf\n"
        "(Confidentiality: Fictitious Mock Legal Data - No Sensitive Records) Tj\n"
        "0 -20 Td\n"
        "(Local Mode: Local-first offline-safe preparation) Tj\n"
        "0 -20 Td\n"
        "(No Cloud logs or remote transfers activated.) Tj\n"
        "ET"
    )
    
    content_bytes = stream_text.encode('ascii')
    
    objs = {
        1: "<< /Type /Catalog /Pages 2 0 R >>",
        2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        3: f"<< /Type /Page /Parent 2 0 R /Resources 6 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>",
        4: f"<< /Length {len(content_bytes)} >>\nstream\n{stream_text}\nendstream",
        5: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        6: "<< /Font << /F1 5 0 R >> >>"
    }
    
    current_offset = 9 # "%PDF-1.4\n" length is 9 bytes
    offsets = {}
    
    with open(filename, 'wb') as f:
        f.write(b"%PDF-1.4\n")
        
        for idx in sorted(objs.keys()):
            offsets[idx] = current_offset
            obj_str = f"{idx} 0 obj\n{objs[idx]}\nendobj\n"
            obj_bytes = obj_str.encode('ascii')
            f.write(obj_bytes)
            current_offset += len(obj_bytes)
            
        startxref = current_offset
        f.write(b"xref\n")
        f.write(f"0 {len(objs) + 1}\n".encode('ascii'))
        f.write(b"0000000000 65535 f\n")
        for idx in sorted(objs.keys()):
            f.write(f"{offsets[idx]:010d} 00000 n\n".encode('ascii'))
            
        f.write(b"trailer\n")
        f.write(f"<< /Size {len(objs) + 1} /Root 1 0 R >>\n".encode('ascii'))
        f.write(b"startxref\n")
        f.write(f"{startxref}\n".encode('ascii'))
        f.write(b"%%EOF\n")

def generate_all_mocks():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../mock_exhibits'))
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Clean up old mock files
    old_files = [
        "04 - Jones Photo.pdf",
        "DEP Jones Exhibit 3.pdf",
        "DOD - 12 - 2012 - Smith - Report.pdf",
        "DX_2_Invoice.pdf",
        "PX-1 - Contract.pdf",
        "Unstructured Document.pdf"
    ]
    for old in old_files:
        old_path = os.path.join(target_dir, old)
        if os.path.exists(old_path):
            os.remove(old_path)
            print(f"Removed old mock: {old}")

    # 2. Define fresh, mock, fictitious legal dataset
    mocks = [
        {
            "filename": "PX-1 - Contract.pdf",
            "label": "PX-1",
            "title": "Acme Corp. Sales & Distribution Agreement",
            "details": "Contract executed on January 15, 2026 for regional logistics."
        },
        {
            "filename": "DX_2_Invoice.pdf",
            "label": "DX-2",
            "title": "Horizon Ltd. Service Invoice #48091",
            "details": "Billed services for professional demonstrative support."
        },
        {
            "filename": "DEP Jones Exhibit 3.pdf",
            "label": "DEP Exhibit 3",
            "title": "Deposition Transcript excerpt of Dr. Arthur Smith",
            "details": "Conducted in New York regional court under local protective order."
        },
        {
            "filename": "DOD - 12 - 2012 - Smith - Report.pdf",
            "label": "DOD-12",
            "title": "Apex Technologies Operations Audit Report",
            "details": "Audited engineering records from the 2012 development cycle."
        },
        {
            "filename": "04 - Jones Photo.pdf",
            "label": "EX-4",
            "title": "Site Photographs Exhibit A - Warehouse Layout",
            "details": "Physical security layout demonstratives taken in August 2025."
        },
        {
            "filename": "Unstructured Document.pdf",
            "label": "EXHIBIT 6",
            "title": "Unstructured Fictitious Patent Schematics",
            "details": "Claim charts and draft figures for litigation review."
        }
    ]

    for mock in mocks:
        filepath = os.path.join(target_dir, mock["filename"])
        create_valid_minimal_pdf(filepath, mock["label"], mock["title"], mock["details"])
        print(f"Generated clean mock: {mock['filename']}")

if __name__ == "__main__":
    generate_all_mocks()
