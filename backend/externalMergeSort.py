import os
import tempfile
import sys
import struct
import heapq

class HeapNode:
    """
    Class giúp đưa phần tử vào min-heap, giúp lưu trữ giá trị của phần tử
    kèm theo file handler để biết phần tử thuộc về file nào
    """
    def __init__(self, item, fileHandler):
        self.item = item
        self.fileHandler = fileHandler
    
    def __lt__(self, other):
        return self.item < other.item

class ExternalMergeSort:
    """
    Class quản lý sắp xếp trộn ngoài (External merge sort). Gồm việc chia nhỏ
    file lớn thành các file nhỏ hơn, sort trên RAM, sau đó merge lại
    """
    def __init__(self):
        self.sortedTempFileNames = [] 
        self.cwd = os.getcwd()
        self.history = []
        
    def splitFiles(self, largeFileName, smallFileSize):
        """
        Đọc file binary lớn, chia nhỏ thành các chunk, sort trong RAM sau đó
        lưu thành các file tạm
        @param:
            largeFileName: đường dẫn tới file binary gốc cần sort
            smallFileSize: kích thước (số lượng) số nguyên tối đa có trong 1 file
        """
        temp_dir = os.path.join(self.cwd, 'temp')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        with open(largeFileName, 'rb') as largeFileHandler:
            tempBuffer = []
            DOUBLE_SIZE = 8
            while True:
                bytes_data = largeFileHandler.read(DOUBLE_SIZE)
                if not bytes_data: break
                number = struct.unpack('d', bytes_data)[0]
                tempBuffer.append(number)
                if len(tempBuffer) >= smallFileSize:
                    self._save_to_temp(tempBuffer, temp_dir)
                    tempBuffer = []
            if tempBuffer:
                self._save_to_temp(tempBuffer, temp_dir)

    def _save_to_temp(self, buffer, temp_dir):
        """
        Sort buffer hiện tại và ghi ra file dưới dạng txt
        @param:
            buffer: danh sách các số nguyên đang có trong RAM
            temp_dir: đường dẫn thư mục temp (thư mục chứa các file txt)
        """
        buffer.sort()
        with tempfile.NamedTemporaryFile(mode='w+', dir=temp_dir, delete=False) as tempFile:
            tempFile.write('\n'.join(str(x) for x in buffer) + '\n')
            self.sortedTempFileNames.append(tempFile.name)
            sample_data = buffer[:3] + ['...'] + buffer[-3:] if len(buffer) > 6 else buffer
            self.history.append({
                "action": "CREATE_TEMP",
                "file_name": os.path.basename(tempFile.name),
                "element_count": len(buffer),
                "sample": sample_data
            })

    def merge_recursive(self, outputFileName):
        """
        Thực hiện merge các file đã sort theo chiến lược Multi-pass giúp tránh
        chương trình bị lỗi khi số lượng file quá lớn
        Thuật toán:
            1. Chia danh sách file tạm thành các batch
            2. Trộn từng nhóm thành 1 file tạm lớn hơn
            3. Lặp lại cho đến khi chỉ còn đúng 1 nhóm cuối cùng
            4. Nhóm cuối cùng sẽ được trộn và ghi ra thành file binary cuối cùng
        @param:
            outputFileName: tên file binary cuối cùng
        """
        MAX_OPEN_FILES = 20  
        temp_dir = os.path.join(self.cwd, 'temp')
        
        if len(self.sortedTempFileNames) == 0:
            open(outputFileName, 'wb').close()
            return
            
        if len(self.sortedTempFileNames) == 1:
            self._merge_batch(self.sortedTempFileNames, outputFileName, is_final=True)
            if os.path.exists(self.sortedTempFileNames[0]):
                os.remove(self.sortedTempFileNames[0])
            self.sortedTempFileNames = []
            return
        
        while len(self.sortedTempFileNames) > 1:
            print(f"Còn lại {len(self.sortedTempFileNames)} file cần trộn...")
            
            new_generation_files = []
            for i in range(0, len(self.sortedTempFileNames), MAX_OPEN_FILES):
                batch_files = self.sortedTempFileNames[i : i + MAX_OPEN_FILES]
                
                if len(self.sortedTempFileNames) <= MAX_OPEN_FILES:
                    self._merge_batch(batch_files, outputFileName, is_final=True)
                    return 
                else:
                    merged_temp = tempfile.NamedTemporaryFile(mode='w+', dir=temp_dir, delete=False)
                    merged_temp_name = merged_temp.name
                    merged_temp.close() 
                    
                    self._merge_batch(batch_files, merged_temp_name, is_final=False)
                    new_generation_files.append(merged_temp_name)
                    
                    for old_file in batch_files:
                        if os.path.exists(old_file):
                            os.remove(old_file)
            
            self.sortedTempFileNames = new_generation_files

    def _merge_batch(self, file_names, output_filename, is_final):
        """
        Hàm trộn 1 nhóm file (K-way merge) sử dụng min-heap
        @param:
            file_names: danh sách các tên file cần trộn
            output_filename: tên file đầu ra
            is_final:
                - True: ghi mode 'wb' - dùng cho kết quả cuối
                - False: ghi mode 'w+' - dùng cho file trung gian
        """
        self.history.append({
            "action": "MERGE_FILES",
            "inputs": [os.path.basename(f) for f in file_names],
            "output": os.path.basename(output_filename),
            "is_final": is_final
        })
        min_heap = []
        open_files = []
        
        try:
            mode = 'wb' if is_final else 'w+'
            with open(output_filename, mode) as out_f:
                
                for name in file_names:
                    f = open(name, 'r')
                    open_files.append(f)
                    line = f.readline().strip()
                    if line:
                        heapq.heappush(min_heap, HeapNode(float(line), f))
                
                while min_heap:
                    min_node = heapq.heappop(min_heap)
                    val = min_node.item
                    
                    if is_final:
                        out_f.write(struct.pack('d', val))
                    else:
                        out_f.write(f"{val}\n")
                    
                    next_line = min_node.fileHandler.readline().strip()
                    if next_line:
                        heapq.heappush(min_heap, HeapNode(float(next_line), min_node.fileHandler))
                        
        finally:
            for f in open_files:
                f.close()

    def verify_result(self, binFileName):
        """
        Hàm dùng để kiểm tra kết quả bằng cách đọc 20 số đầu tiên của file nhị phân,
        giúp người dùng nhận biết được file đã được sort hay chưa
        @param:
            binFileName: tên của file binary cần kiểm tra
        """
        print(f"\n--- Kiểm tra 20 số đầu của: {binFileName} ---")
        if not os.path.exists(binFileName):
            print("Chưa có file.")
            return
        with open(binFileName, 'rb') as f:
            for _ in range(20):
                data = f.read(8)
                if not data: break
                print(struct.unpack('d', data)[0], end=' ')
        print("\n")

if __name__ == '__main__':
    largeFileName = 'large_data.bin'
    outputFile = 'sorted_output.bin'
    
    # Bạn có thể giữ số nhỏ để test thuật toán Multi-pass
    # Hoặc tăng lên 1,000,000 để chạy nhanh hơn.
    smallFileSize = 10000 
    
    obj = ExternalMergeSort()
    
    if os.path.exists(largeFileName):
        print("1. Chia file...")
        obj.splitFiles(largeFileName, smallFileSize)
        
        print(f"   -> Đã tạo {len(obj.sortedTempFileNames)} file tạm.")
        print("2. Bắt đầu trộn (Multi-pass Merge)...")
        
        # Gọi hàm mới: merge_recursive thay vì hàm cũ
        obj.merge_recursive(outputFile)
        
        obj.verify_result(outputFile)
        
        # Dọn dẹp temp còn sót (nếu có)
        # Lưu ý: Hàm merge_recursive đã tự xóa dần các file con rồi.
    else:
        print("Thiếu file input.")