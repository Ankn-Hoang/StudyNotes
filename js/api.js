const API_BASE = 'https://6a4c9982e1cf82a4a17d3fd6.mockapi.io';

const ENDPOINTS = {
  documents: `${API_BASE}/documents`,
  subjects: `${API_BASE}/subjects`, // Endpoint để lấy danh sách môn học đổ vào select
};

// --- GET all subjects ---
// Hàm này dùng để lấy các môn học đổ tự động vào thanh lọc môn học
function getAllSubjects() {
  return fetch(ENDPOINTS.subjects)
    .then(function(res) {
      if (!res.ok) throw new Error('Lỗi HTTP lấy môn học: ' + res.status);
      return res.json();
    });
}

// --- TỐI ƯU HÓA: GET tài liệu kết hợp lọc Client chuẩn xác tuyệt đối ---
// Hàm này sẽ lấy toàn bộ danh sách, sau đó dùng JS lọc chính xác theo Tende, subjectId và Nam
function getAllDocuments(search = "", subjectId = "", schoolYear = "") {
  return fetch(ENDPOINTS.documents)
    .then(function(res) {
      if (!res.ok) throw new Error('Lỗi HTTP: ' + res.status);
      return res.json();
    })
    .then(function(docs) {
      // Tiến hành lọc chính xác bằng Javascript ở Client để tránh lỗi bộ lọc của MockAPI
      return docs.filter(function(doc) {
        // 1. Lọc theo từ khóa tìm kiếm (Tìm trong tiêu đề Tende)
        var matchSearch = !search || (doc.Tende || '').toLowerCase().includes(search.toLowerCase().trim());

        // 2. Lọc theo Môn học (Ép kiểu về String để so sánh chính xác tuyệt đối)
        var matchSubject = !subjectId || String(doc.subjectId) === String(subjectId);

        // 3. Lọc theo Năm học
        var matchYear = !schoolYear || String(doc.Nam) === String(schoolYear);

        return matchSearch && matchSubject && matchYear;
      });
    });
}

// --- GET single document by id ---
function getDocumentById(id) {
  return fetch(ENDPOINTS.documents + '/' + id)
    .then(function(res) {
      if (!res.ok) throw new Error('Không tìm thấy tài liệu');
      return res.json();
    });
}

// --- POST create new document ---
// Khi tạo tài liệu mới từ form Admin, data truyền vào mang cấu trúc: { Tende, Mota, Link, Nam, subjectId, views: 0, status: "Pending" }
function createDocument(data) {
  // Đảm bảo bài viết mới luôn bắt đầu với 0 lượt xem và trạng thái Chờ duyệt
  if (data) {
    if (data.views === undefined) data.views = 0;
    if (data.status === undefined) data.status = 'Pending';
    // Đảm bảo loại bỏ hoàn toàn thuộc tính imageUrl cũ nếu còn sót lại
    if (data.imageUrl !== undefined) delete data.imageUrl; 
  }

  return fetch(ENDPOINTS.documents, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function(res) {
    if (!res.ok) throw new Error('Không thể tạo tài liệu');
    return res.json();
  });
}

// --- PUT update document ---
function updateDocument(id, data) {
  // Đảm bảo không gửi kèm imageUrl cũ lên MockAPI khi cập nhật tài liệu
  if (data && data.imageUrl !== undefined) {
    delete data.imageUrl;
  }

  return fetch(ENDPOINTS.documents + '/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function(res) {
    if (!res.ok) throw new Error('Không thể cập nhật tài liệu');
    return res.json();
  });
}

// --- DELETE document ---
function deleteDocument(id) {
  return fetch(ENDPOINTS.documents + '/' + id, {
    method: 'DELETE'
  }).then(function(res) {
    if (!res.ok) throw new Error('Không thể xóa tài liệu');
    return res.json();
  });
}

// --- PATCH/PUT increment view count ---
// Hàm tăng lượt xem đọc đúng thuộc tính trường 'views' từ đối tượng document
function incrementView(doc) {
  var newViews = (parseInt(doc.views) || 0) + 1;
  return updateDocument(doc.id, { views: newViews });
}

// --- TỐI ƯU HÓA: jQuery AJAX kết hợp lọc Client ---
function ajaxGetDocuments(search = "", subjectId = "", schoolYear = "") {
  return $.ajax({
    url: ENDPOINTS.documents,
    method: 'GET',
    dataType: 'json'
  }).then(function(docs) {
    // Lọc bằng jQuery/JS Client tương tự để đảm bảo đồng bộ
    return docs.filter(function(doc) {
      var matchSearch = !search || (doc.Tende || '').toLowerCase().includes(search.toLowerCase().trim());
      var matchSubject = !subjectId || String(doc.subjectId) === String(subjectId);
      var matchYear = !schoolYear || String(doc.Nam) === String(schoolYear);
      return matchSearch && matchSubject && matchYear;
    });
  });
}