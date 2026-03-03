import random
import os
import struct

def generate_file(file_name, total_numbers, range_limit):
    """
    Hàm dùng để tạo dữ liệu để sắp xếp
    """
    buffer_size = 100000
    with open(file_name, 'wb') as f:
        count = 0
        while count < total_numbers:
            current_batch_size = min(buffer_size, total_numbers - count)
            numbers = [random.uniform(0, range_limit) for _ in range(current_batch_size)]
            packed_data = struct.pack(f'{current_batch_size}d', *numbers)
            
            f.write(packed_data)
            count += current_batch_size

        