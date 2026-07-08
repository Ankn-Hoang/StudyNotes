const API_BASE = 'https://6a4c9982e1cf82a4a17d3fd6.mockapi.io';

const ENDPOINTS = {
  documents: `${API_BASE}/documents`,
  subjects: `${API_BASE}/subjects`,
};

function getAllSubjects() {
  return fetch(ENDPOINTS.subjects)
    .then(function(res) {
      if (!res.ok) throw new Error('Lỗi HTTP lấy môn học: ' + res.status);
      return res.json();
    });
}

function getAllDocuments(search = "", subjectId = "", schoolYear = "") {
  return fetch(ENDPOINTS.documents)
    .then(function(res) {
      if (!res.ok) throw new Error('Lỗi HTTP: ' + res.status);
      return res.json();
    })
    .then(function(docs) {
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

function getDocumentById(id) {
  return fetch(ENDPOINTS.documents + '/' + id)
    .then(function(res) {
      if (!res.ok) throw new Error('Không tìm thấy tài liệu');
      return res.json();
    });
}

function createDocument(data) {
  if (data) {
    if (data.views === undefined) data.views = 0;
    if (data.status === undefined) data.status = 'Pending';
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

function updateDocument(id, data) {
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

function deleteDocument(id) {
  return fetch(ENDPOINTS.documents + '/' + id, {
    method: 'DELETE'
  }).then(function(res) {
    if (!res.ok) throw new Error('Không thể xóa tài liệu');
    return res.json();
  });
}

function incrementView(doc) {
  var newViews = (parseInt(doc.views) || 0) + 1;
  return updateDocument(doc.id, { views: newViews });
}

function ajaxGetDocuments(search = "", subjectId = "", schoolYear = "") {
  return $.ajax({
    url: ENDPOINTS.documents,
    method: 'GET',
    dataType: 'json'
  }).then(function(docs) {
    return docs.filter(function(doc) {
      var matchSearch = !search || (doc.Tende || '').toLowerCase().includes(search.toLowerCase().trim());
      var matchSubject = !subjectId || String(doc.subjectId) === String(subjectId);
      var matchYear = !schoolYear || String(doc.Nam) === String(schoolYear);
      return matchSearch && matchSubject && matchYear;
    });
  });
}