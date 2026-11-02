const crypto = require("crypto");
const pool = require("../db/mysql");

function normalizeKeyword(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createProductKey(platform, url, name) {
  const p = normalizeKeyword(platform || "unknown");
  const u = String(url || "").trim();
  const n = normalizeKeyword(name || "");
  if (u) return `${p}|${u}`;
  return `${p}|${n}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Danh sách toàn diện 80+ chủ đề quà tặng theo Đối tượng nhận, Dịp tặng, Sở thích
const GIFT_CRAWL_TOPICS = [
  // ================= 1. QUÀ BẠN GÁI / NGƯỜI YÊU NỮ / VỢ (20/10, 8/3, VALENTINE, SINH NHẬT, KỶ NIỆM) =================
  {
    query: "set quà tặng bạn gái 20/10",
    category: "Quà 20/10 & 8/3",
    tags: "quà bạn gái 20/10 người yêu nữ vợ lễ phụ nữ việt nam 8/3 sinh nhật lãng mạn set quà hộp quà",
  },
  {
    query: "hộp quà tặng 20/10 cho nữ",
    category: "Quà 20/10 & 8/3",
    tags: "quà 20/10 8/3 bạn gái người yêu vợ mẹ chị gái em gái đồng nghiệp nữ hộp quà tặng",
  },
  {
    query: "set quà tặng 8/3 cho bạn gái",
    category: "Quà 20/10 & 8/3",
    tags: "quà 8/3 20/10 quốc tế phụ nữ bạn gái người yêu nữ vợ lãng mạn tinh tế",
  },
  {
    query: "hoa hồng sáp thơm hộp quà tặng bạn gái",
    category: "Hoa & Quà Lãng Mạn",
    tags: "hoa sáp hoa hồng quà 20/10 8/3 valentine 14/2 kỷ niệm sinh nhật bạn gái người yêu vợ nữ lãng mạn",
  },
  {
    query: "bó hoa sáp thơm kèm đèn led quà tặng",
    category: "Hoa & Quà Lãng Mạn",
    tags: "bó hoa sáp hoa hồng quà 20/10 8/3 valentine sinh nhật kỷ niệm bạn gái người yêu nữ",
  },
  {
    query: "son môi chính hãng quà tặng bạn gái",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "son môi son kem son thỏi mỹ phẩm làm đẹp quà 20/10 8/3 valentine sinh nhật kỷ niệm bạn gái người yêu nữ vợ",
  },
  {
    query: "set son kem lì hộp quà tặng",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "set son son môi làm đẹp mỹ phẩm quà tặng bạn gái người yêu nữ vợ 20/10 8/3 valentine sinh nhật",
  },
  {
    query: "son dưỡng môi có màu chính hãng",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "son dưỡng son môi làm đẹp mỹ phẩm quà 20/10 8/3 sinh nhật bạn gái người yêu nữ chị em",
  },
  {
    query: "nước hoa nữ chính hãng thơm lâu",
    category: "Nước Hoa & Làm Đẹp",
    tags: "nước hoa nữ thơm lâu quyến rũ làm đẹp quà 20/10 8/3 valentine sinh nhật kỷ niệm bạn gái người yêu vợ nữ",
  },
  {
    query: "set nước hoa mini nữ hộp quà",
    category: "Nước Hoa & Làm Đẹp",
    tags: "nước hoa nữ set nước hoa làm đẹp quà 20/10 8/3 valentine sinh nhật bạn gái người yêu vợ",
  },
  {
    query: "dây chuyền bạc nữ s925 mặt cỏ 4 lá",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "dây chuyền bạc trang sức nữ vòng cổ quà 20/10 8/3 valentine sinh nhật kỷ niệm bạn gái người yêu vợ",
  },
  {
    query: "lắc tay bạc nữ s925 đính đá",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "vòng tay lắc tay bạc nữ trang sức quà 20/10 8/3 valentine sinh nhật kỷ niệm bạn gái người yêu vợ",
  },
  {
    query: "bông tai bạc nữ tinh tế",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "bông tai khuyên tai bạc nữ trang sức thời trang quà 20/10 8/3 sinh nhật bạn gái người yêu",
  },
  {
    query: "nhẫn đôi bạc s925 tình nhân",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "nhẫn đôi nhẫn bạc trang sức tình yêu valentine kỷ niệm người yêu bạn gái bạn trai",
  },
  {
    query: "đồng hồ đeo tay nữ chính hãng sang trọng",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "đồng hồ nữ thời trang trang sức quà 20/10 8/3 sinh nhật kỷ niệm bạn gái vợ mẹ cô giáo",
  },
  {
    query: "túi xách nữ đeo chéo thời trang",
    category: "Thời Trang Nữ",
    tags: "túi xách nữ túi đeo chéo thời trang quà 20/10 8/3 sinh nhật kỷ niệm bạn gái người yêu vợ mẹ",
  },
  {
    query: "ví nữ cầm tay mini dễ thương",
    category: "Thời Trang Nữ",
    tags: "ví nữ bóp nữ thời trang phụ kiện quà 20/10 8/3 sinh nhật bạn gái người yêu bạn bè nữ",
  },
  {
    query: "set nến thơm tinh dầu thư giãn hộp quà",
    category: "Nến Thơm & Thư Giãn",
    tags: "nến thơm tinh dầu thư giãn decor lãng mạn quà 20/10 8/3 valentine sinh nhật giáng sinh bạn gái người yêu bạn bè",
  },
  {
    query: "gấu bông capybara dễ thương",
    category: "Gấu Bông & Quà Cute",
    tags: "gấu bông thú nhồi bông capybara cute dễ thương quà sinh nhật 20/10 8/3 valentine bạn gái người yêu em gái",
  },
  {
    query: "gấu bông teddy mềm mịn cao cấp",
    category: "Gấu Bông & Quà Cute",
    tags: "gấu bông teddy thú bông dễ thương quà tặng bạn gái người yêu nữ valentine 20/10 8/3 sinh nhật",
  },
  {
    query: "gấu bông dâu lotso hương dâu",
    category: "Gấu Bông & Quà Cute",
    tags: "gấu bông lotso thú nhồi bông cute quà bạn gái người yêu sinh nhật 20/10 8/3 valentine",
  },
  {
    query: "hộp quà socola valentine ngọt ngào",
    category: "Quà Valentine & Kỷ Niệm",
    tags: "socola chocolate valentine 14/2 lễ tình nhân kỷ niệm người yêu bạn gái bạn trai lãng mạn",
  },
  {
    query: "máy rửa mặt massage sóng âm",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "máy rửa mặt chăm sóc da làm đẹp mỹ phẩm quà 20/10 8/3 sinh nhật bạn gái vợ người yêu nữ",
  },
  {
    query: "bộ mỹ phẩm dưỡng da skincare chính hãng",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "mỹ phẩm dưỡng da skincare kem dưỡng serum làm đẹp quà 20/10 8/3 sinh nhật bạn gái vợ mẹ",
  },
  {
    query: "set sữa tắm dưỡng thể hương nước hoa hộp quà",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "sữa tắm dưỡng thể chăm sóc cơ thể làm đẹp quà 20/10 8/3 20/11 sinh nhật bạn gái vợ mẹ cô giáo",
  },
  {
    query: "túi chườm ấm bụng kinh nguyệt massage cho bạn gái",
    category: "Chăm Sóc Sức Khỏe",
    tags: "đai chườm ấm bụng túi sưởi quà tâm lý tặng bạn gái người yêu nữ 20/10 8/3 valentine sinh nhật",
  },
  {
    query: "máy sấy tóc ion âm bảo vệ tóc",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "máy sấy tóc làm đẹp chăm sóc tóc quà 20/10 8/3 sinh nhật bạn gái vợ mẹ",
  },
  {
    query: "gương trang điểm đèn led cảm ứng để bàn",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "gương trang điểm làm đẹp mỹ phẩm quà 20/10 8/3 sinh nhật bạn gái người yêu nữ",
  },
  {
    query: "set kẹp tóc ngọc trai hàn quốc hộp quà",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "kẹp tóc phụ kiện tóc thời trang nữ dễ thương quà 20/10 8/3 sinh nhật bạn gái bạn bè dưới 100k",
  },
  {
    query: "kem dưỡng da tay hương nước hoa hộp quà",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "kem dưỡng da tay mỹ phẩm làm đẹp quà 20/10 8/3 giáng sinh bạn gái đồng nghiệp nữ dưới 200k",
  },

  // ================= 2. QUÀ BẠN TRAI / NGƯỜI YÊU NAM / CHỒNG =================
  {
    query: "ví da bò nam cao cấp hộp quà tặng",
    category: "Phụ Kiện Nam",
    tags: "ví da nam bóp nam thời trang nam quà sinh nhật valentine kỷ niệm bạn trai người yêu nam chồng bố",
  },
  {
    query: "thắt lưng da nam cao cấp kèm hộp quà",
    category: "Phụ Kiện Nam",
    tags: "thắt lưng nam dây nịt da nam thời trang quà sinh nhật kỷ niệm valentine bạn trai chồng bố sếp nam",
  },
  {
    query: "đồng hồ đeo tay nam chính hãng lịch lãm",
    category: "Đồng Hồ & Phụ Kiện Nam",
    tags: "đồng hồ nam thời trang nam lịch lãm quà sinh nhật kỷ niệm valentine bạn trai chồng bố sếp",
  },
  {
    query: "nước hoa nam chính hãng lịch lãm nam tính",
    category: "Nước Hoa Nam",
    tags: "nước hoa nam thơm lâu nam tính quà sinh nhật valentine kỷ niệm bạn trai người yêu nam chồng",
  },
  {
    query: "máy cạo râu điện thông minh chống nước",
    category: "Chăm Sóc Nam Giới",
    tags: "máy cạo râu chăm sóc nam giới quà sinh nhật kỷ niệm bạn trai chồng bố thiết thực",
  },
  {
    query: "áo polo nam cao cấp lịch lãm",
    category: "Thời Trang Nam",
    tags: "áo polo nam áo thun nam thời trang nam quà sinh nhật bạn trai chồng bố anh trai",
  },
  {
    query: "áo sơ mi nam dài tay cao cấp hộp quà",
    category: "Thời Trang Nam",
    tags: "áo sơ mi nam thời trang công sở quà sinh nhật 20/11 bạn trai chồng bố thầy giáo sếp nam",
  },
  {
    query: "cà vạt nam lụa cao cấp hộp quà",
    category: "Phụ Kiện Nam",
    tags: "cà vạt nam phụ kiện công sở quà 20/11 sinh nhật thăng chức thầy giáo bố chồng sếp nam",
  },
  {
    query: "túi đeo chéo nam chống nước thời trang",
    category: "Phụ Kiện Nam",
    tags: "túi đeo chéo nam thời trang phụ kiện quà sinh nhật bạn trai em trai bạn bè nam",
  },

  // ================= 3. CÔNG NGHỆ, ÂM NHẠC, GAMING =================
  {
    query: "tai nghe bluetooth không dây chống ồn chính hãng",
    category: "Công Nghệ & Âm Thanh",
    tags: "tai nghe bluetooth không dây công nghệ âm nhạc gaming quà sinh nhật bạn trai bạn gái người yêu bạn bè",
  },
  {
    query: "loa bluetooth mini chính hãng âm thanh hay",
    category: "Công Nghệ & Âm Thanh",
    tags: "loa bluetooth âm nhạc công nghệ quà sinh nhật giáng sinh bạn trai bạn gái bạn bè",
  },
  {
    query: "bàn phím cơ không dây led rgb gaming",
    category: "Gaming & Công Nghệ",
    tags: "bàn phím cơ gaming công nghệ máy tính quà sinh nhật bạn trai em trai game thủ",
  },
  {
    query: "chuột gaming không dây chính hãng",
    category: "Gaming & Công Nghệ",
    tags: "chuột gaming chuột không dây công nghệ quà sinh nhật bạn trai đồng nghiệp game thủ",
  },
  {
    query: "tay cầm chơi game không dây bluetooth",
    category: "Gaming & Công Nghệ",
    tags: "tay cầm chơi game gamepad gaming công nghệ quà sinh nhật bạn trai em trai",
  },
  {
    query: "đồng hồ thông minh smartwatch theo dõi sức khỏe",
    category: "Công Nghệ & Thể Thao",
    tags: "đồng hồ thông minh smartwatch công nghệ thể thao sức khỏe quà sinh nhật kỷ niệm người yêu bạn trai bạn gái bố mẹ",
  },
  {
    query: "pin sạc dự phòng nhanh 20000mah chính hãng",
    category: "Công Nghệ & Phụ Kiện",
    tags: "sạc dự phòng phụ kiện công nghệ thiết thực quà sinh nhật bạn bè người yêu đồng nghiệp",
  },
  {
    query: "máy ảnh kỹ thuật số mini chụp lấy liền",
    category: "Công Nghệ & Nhiếp Ảnh",
    tags: "máy ảnh mini máy ảnh lấy liền instax công nghệ chụp ảnh quà sinh nhật kỷ niệm 20/10 bạn gái người yêu",
  },

  // ================= 4. QUÀ TẶNG BỐ MẸ, ÔNG BÀ, NGƯỜI LỚN TUỔI (SỨC KHỎE & GIA ĐÌNH) =================
  {
    query: "máy massage cổ vai gáy hồng ngoại cao cấp",
    category: "Sức Khỏe & Gia Đình",
    tags: "máy massage cổ vai gáy chăm sóc sức khỏe quà tặng bố mẹ ông bà vợ chồng 20/10 8/3 sinh nhật tết",
  },
  {
    query: "gối massage hồng ngoại đa năng cổ vai lưng",
    category: "Sức Khỏe & Gia Đình",
    tags: "gối massage máy massage sức khỏe quà tặng bố mẹ ông bà người lớn tuổi sinh nhật tết",
  },
  {
    query: "bồn ngâm chân massage tự động làm ấm nước",
    category: "Sức Khỏe & Gia Đình",
    tags: "bồn ngâm chân massage sức khỏe thư giãn quà tặng bố mẹ ông bà 50 tuổi sinh nhật tết",
  },
  {
    query: "máy đo huyết áp điện tử bắp tay chính hãng",
    category: "Sức Khỏe & Gia Đình",
    tags: "máy đo huyết áp chăm sóc sức khỏe người cao tuổi quà tặng bố mẹ ông bà trên 50 tuổi",
  },
  {
    query: "hộp quà yến sào chưng sẵn cao cấp biếu tặng",
    category: "Quà Sức Khỏe Cao Cấp",
    tags: "yến sào hộp quà sức khỏe dinh dưỡng biếu bố mẹ ông bà sếp tết sinh nhật 20/10 8/3",
  },
  {
    query: "hộp quà nước hồng sâm hàn quốc cao cấp",
    category: "Quà Sức Khỏe Cao Cấp",
    tags: "hồng sâm nhân sâm hàn quốc sức khỏe quà biếu bố mẹ ông bà sếp tết sinh nhật",
  },
  {
    query: "set quà trà hoa thảo mộc dưỡng nhan",
    category: "Trà & Sức Khỏe",
    tags: "trà hoa cúc trà thảo mộc trà dưỡng nhan sức khỏe quà tặng mẹ bạn gái cô giáo đồng nghiệp 20/10 8/3 20/11",
  },
  {
    query: "bộ ấm chén uống trà gốm sứ cao cấp hộp quà",
    category: "Gia Dụng & Trà Đạo",
    tags: "bộ ấm chén ấm trà gốm sứ minh long bát tràng quà tặng bố mẹ sếp tân gia tết thầy giáo",
  },
  {
    query: "khăn choàng cổ lụa tơ tằm cao cấp hộp quà",
    category: "Thời Trang & Quà Mẹ",
    tags: "khăn lụa khăn choàng cổ thời trang nữ sang trọng quà tặng mẹ bà cô giáo sếp nữ 20/10 8/3 20/11",
  },
  {
    query: "túi xách nữ tặng mẹ trung niên sang trọng",
    category: "Thời Trang & Quà Mẹ",
    tags: "túi xách nữ trung niên tặng mẹ bà cô giáo 20/10 8/3 sinh nhật sang trọng",
  },
  {
    query: "cài áo hoa pha lê cao cấp hộp quà",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "cài áo ghim cài áo vest áo dài phụ kiện nữ sang trọng quà tặng mẹ cô giáo sếp nữ 20/10 8/3 20/11",
  },

  // ================= 5. QUÀ TẶNG THẦY CÔ (20/11), SẾP, ĐỒNG NGHIỆP, CÔNG SỞ =================
  {
    query: "bút ký cao cấp khắc tên kèm hộp sang trọng",
    category: "Quà Công Sở & Tri Ân",
    tags: "bút ký cao cấp bút kim loại quà tặng sếp thầy cô giáo đồng nghiệp đối tác 20/11 thăng chức tốt nghiệp",
  },
  {
    query: "set quà sổ tay bìa da và bút ký kèm bình giữ nhiệt",
    category: "Quà Công Sở & Tri Ân",
    tags: "sổ tay da bút ký bình giữ nhiệt giftset công sở quà 20/11 thầy cô giáo sếp đồng nghiệp",
  },
  {
    query: "bình giữ nhiệt inox 304 hiển thị nhiệt độ hộp quà",
    category: "Văn Phòng & Đời Sống",
    tags: "bình giữ nhiệt ly giữ nhiệt văn phòng thể thao quà tặng thầy cô 20/11 đồng nghiệp bạn bè người yêu",
  },
  {
    query: "cặp da công sở đựng laptop cao cấp",
    category: "Quà Công Sở & Tri Ân",
    tags: "cặp da túi laptop công sở quà tặng sếp thầy giáo bố chồng 20/11 sinh nhật thăng chức",
  },
  {
    query: "hộp quà trà ô long thượng hạng biếu tặng",
    category: "Trà & Sức Khỏe",
    tags: "trà ô long trà thái nguyên hộp quà trà biếu bố sếp thầy giáo tết tân gia",
  },
  {
    query: "cốc sứ giữ nhiệt kèm đế hâm nóng 55 độ hộp quà",
    category: "Văn Phòng & Cafe",
    tags: "cốc sứ ly sứ đế hâm nóng cafe trà văn phòng quà tặng đồng nghiệp bạn gái cô giáo 20/10 20/11 giáng sinh",
  },
  {
    query: "gối tựa lưng kê cổ văn phòng cao su non",
    category: "Văn Phòng & Đời Sống",
    tags: "gối tựa lưng gối văn phòng sức khỏe quà tặng đồng nghiệp bạn bè người yêu dân văn phòng",
  },

  // ================= 6. QUÀ TỐT NGHIỆP, TÂN GIA, GIÁNG SINH, BẠN BÈ, SÁCH, CAFE, THỂ THAO =================
  {
    query: "gấu bông cử nhân tốt nghiệp kèm bó hoa hướng dương",
    category: "Quà Tốt Nghiệp",
    tags: "gấu bông cử nhân hoa hướng dương quà tốt nghiệp lễ tốt nghiệp ra trường bạn bè người yêu anh chị em",
  },
  {
    query: "bó hoa hướng dương len móc thủ công quà tốt nghiệp",
    category: "Quà Tốt Nghiệp",
    tags: "hoa len móc hoa hướng dương handmade quà tốt nghiệp 20/10 8/3 20/11 sinh nhật bạn bè người yêu",
  },
  {
    query: "máy xông khuếch tán tinh dầu siêu âm vân gỗ",
    category: "Quà Tân Gia & Thư Giãn",
    tags: "máy xông tinh dầu khuếch tán tinh dầu thư giãn thơm phòng quà tân gia sinh nhật 20/10 bạn bè đồng nghiệp",
  },
  {
    query: "bộ bát đĩa gốm sứ cao cấp hộp quà tân gia",
    category: "Quà Tân Gia & Gia Dụng",
    tags: "bộ bát đĩa chén dĩa gốm sứ gia dụng quà tân gia nhà mới cưới mẹ vợ",
  },
  {
    query: "bộ bình cốc thủy tinh chịu nhiệt cao cấp",
    category: "Quà Tân Gia & Gia Dụng",
    tags: "bộ ly cốc thủy tinh bình nước quà tân gia đồng nghiệp gia đình",
  },
  {
    query: "quả cầu tuyết phát nhạc có đèn quà giáng sinh",
    category: "Quà Giáng Sinh & Lưu Niệm",
    tags: "quả cầu tuyết hộp nhạc quà giáng sinh noel sinh nhật valentine bạn gái người yêu em gái lãng mạn",
  },
  {
    query: "khăn choàng cổ len cashmere ấm áp hộp quà",
    category: "Quà Giáng Sinh & Thời Trang",
    tags: "khăn len khăn quàng cổ ấm áp mùa đông quà giáng sinh noel 20/10 sinh nhật bạn gái bạn trai mẹ",
  },
  {
    query: "set tất vớ len giáng sinh noel hộp quà",
    category: "Quà Giáng Sinh & Lưu Niệm",
    tags: "tất vớ giáng sinh noel mùa đông cute dễ thương quà tặng bạn bè người yêu dưới 100k",
  },
  {
    query: "hộp nhạc gỗ cổ điển dây cót quà lưu niệm",
    category: "Quà Lưu Niệm & Âm Nhạc",
    tags: "hộp nhạc gỗ âm nhạc lưu niệm lãng mạn quà sinh nhật valentine bạn gái bạn thân",
  },
  {
    query: "album khung ảnh kỷ niệm để bàn",
    category: "Quà Lưu Niệm & Kỷ Niệm",
    tags: "khung ảnh album ảnh kỷ niệm lưu niệm quà tốt nghiệp kỷ niệm yêu nhau sinh nhật bạn thân người yêu",
  },
  {
    query: "sách nhà giả kim cây cam ngọt của tôi",
    category: "Sách & Tri Thức",
    tags: "sách hay tiểu thuyết văn học đọc sách quà sinh nhật tốt nghiệp bạn bè người yêu",
  },
  {
    query: "sách đắc nhân tâm tư duy phát triển bản thân",
    category: "Sách & Tri Thức",
    tags: "sách kỹ năng sống sách kinh doanh đọc sách quà tặng bạn bè đồng nghiệp tốt nghiệp",
  },
  {
    query: "máy pha cà phê espresso mini cầm tay",
    category: "Văn Phòng & Cafe",
    tags: "máy pha cà phê cafe cà phê văn phòng quà tặng bạn trai sếp đồng nghiệp",
  },
  {
    query: "hộp quà cà phê đặc sản nguyên chất kèm phin",
    category: "Văn Phòng & Cafe",
    tags: "cà phê hộp quà cafe quà tặng bố sếp thầy giáo đồng nghiệp",
  },
  {
    query: "balo laptop thời trang chống thấm nước",
    category: "Thời Trang & Phụ Kiện",
    tags: "balo laptop cặp sách thời trang quà tốt nghiệp sinh nhật bạn bè người yêu anh chị em",
  },
  {
    query: "thảm tập yoga định tuyến cao su tự nhiên",
    category: "Thể Thao & Sức Khỏe",
    tags: "thảm tập yoga thể thao tập gym sức khỏe quà tặng bạn gái mẹ bạn bè yêu thể thao",
  },
  {
    query: "túi trống thể thao tập gym chống nước",
    category: "Thể Thao & Sức Khỏe",
    tags: "túi tập gym túi thể thao bóng đá chạy bộ quà tặng bạn trai bạn bè yêu thể thao",
  },
  {
    query: "vợt cầu lông carbon siêu nhẹ kèm túi",
    category: "Thể Thao & Sức Khỏe",
    tags: "vợt cầu lông thể thao vận động quà sinh nhật bạn trai bạn bè đồng nghiệp",
  },
  {
    query: "hộp quà tết hạt dinh dưỡng cao cấp",
    category: "Quà Tết & Sức Khỏe",
    tags: "hộp quà tết hạt dinh dưỡng macca hạnh nhân sức khỏe biếu bố mẹ ông bà sếp",
  },
  // ================= 15. QUÀ HALLOWEEN & LỄ HỘI HÓA TRANG =================
  {
    query: "đèn bí ngô halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "đèn bí ngô halloween quả bí ngô phát sáng đèn lồng cầm tay led trang trí quà tặng bạn gái bạn bè trẻ em",
  },
  {
    query: "kẹo mút halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "kẹo mút halloween trick or treat kẹo ma quái kẹo mắt quà tặng bạn bè người yêu học sinh trẻ em",
  },
  {
    query: "mặt nạ hóa trang halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "mặt nạ halloween hóa trang ma cà rồng vô diện dạ quang kinh dị tiệc tùng quà tặng bạn trai bạn bè",
  },
  {
    query: "áo choàng phù thủy halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "áo choàng phù thủy kèm nón nhọn pháp sư cosplay hóa trang quà tặng bạn gái bạn bè trẻ em",
  },
  {
    query: "cốc sứ quả bí ngô có nắp",
    category: "Quà Halloween & Hóa Trang",
    tags: "cốc sứ bí ngô ly sứ quả bí ngô có nắp decor phòng văn phòng quà tặng người yêu bạn gái bạn bè",
  },
  {
    query: "gấu bông bí ngô halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "gấu bông bí ngô capybara đội nón phù thủy gấu bông ma cute thú nhồi bông quà tặng bạn gái người yêu",
  },
  {
    query: "băng đô cài tóc bí ngô halloween",
    category: "Quà Halloween & Hóa Trang",
    tags: "bờm cài tóc dơi nhện bí ngô phụ kiện hóa trang chụp ảnh sống ảo quà bạn gái",
  },
];

const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function createCrawlerDriver() {
  const options = new chrome.Options();
  options.setPageLoadStrategy("eager");
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
    "--disable-blink-features=AutomationControlled",
    "--lang=vi-VN"
  );
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  return driver;
}

async function fetchTikiProductsViaBrowser(driver, topic, limit = 22) {
  const apiUrl = `https://tiki.vn/api/v2/products?limit=${limit}&q=${encodeURIComponent(
    topic.query
  )}`;
  try {
    const rawItems = await driver.executeAsyncScript(
      `
      const url = arguments[0];
      const callback = arguments[arguments.length - 1];
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(d => callback(Array.isArray(d && d.data) ? d.data : []))
        .catch(() => callback([]));
      `,
      apiUrl
    );

    if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

    const results = [];
    for (const item of rawItems) {
      if (!item || !item.name || !item.price || item.price < 5000) continue;
      let image = item.thumbnail_url || "";
      if (!image || !image.startsWith("http") || image.includes("placeholder")) {
        continue;
      }
      image = image.replace("/cache/280x280/", "/cache/450x450/");

      const productUrl = item.url_path
        ? `https://tiki.vn/${String(item.url_path).replace(/^\//, "")}`
        : "";
      if (!productUrl) continue;

      const enrichedKeyword = normalizeKeyword(
        `${topic.query} | ${topic.category} | ${topic.tags}`
      ).slice(0, 490);

      results.push({
        product_key: createProductKey("Tiki", productUrl, item.name).slice(0, 490),
        platform: "Tiki",
        name: String(item.name).trim(),
        price: Number(item.price),
        currency: "VND",
        image,
        url: productUrl,
        condition_name: "New",
        category: topic.category,
        location: "Vietnam",
        search_keyword: enrichedKeyword,
        score: item.rating_average ? Math.round(Number(item.rating_average) * 18) : 85,
        reason: `Phù hợp cho chủ đề: ${topic.category}`,
      });
    }
    return results;
  } catch (err) {
    console.error(`Browser fetch error for "${topic.query}":`, err.message);
    return [];
  }
}

async function runBulkCrawl() {
  console.log("====================================================");
  console.log("🚀 BẮT ĐẦU DỌN DẸP & CÀO DỮ LIỆU QUÀ TẶNG ĐA DẠNG");
  console.log("====================================================");

  const conn = await pool.getConnection();
  let driver = null;
  try {
    const [delBroken] = await conn.query(`
      DELETE FROM scraped_products
      WHERE image IS NULL
         OR image = ''
         OR image LIKE 'data:%'
         OR price IS NULL
         OR price < 5000
         OR name LIKE '%WS2811%'
         OR name LIKE '%WS2812%'
         OR name LIKE '%Mạch In Đen%'
         OR name LIKE '%máy xóc bài%'
         OR name LIKE '%phỉnh poker%'
         OR name LIKE '%roulette%'
    `);
    console.log(`🧹 Đã dọn dẹp ${delBroken.affectedRows} sản phẩm lỗi / không có ảnh / không phù hợp làm quà tặng.`);

    driver = await createCrawlerDriver();
    console.log("🌐 Đang khởi tạo trình duyệt Chrome để cào dữ liệu...");
    await driver.get("https://tiki.vn/");
    await sleep(3000);

    let totalSaved = 0;
    let topicIndex = 0;

    for (const topic of GIFT_CRAWL_TOPICS) {
      topicIndex++;
      const [existing] = await conn.query(
        "SELECT COUNT(*) as c FROM scraped_products WHERE search_keyword LIKE ?",
        [`${normalizeKeyword(topic.query)}%`]
      );
      if (existing[0].c >= 12) {
        console.log(
          `[${topicIndex}/${GIFT_CRAWL_TOPICS.length}] ⏭️ "${topic.query}" đã có ${existing[0].c} món quà, bỏ qua.`
        );
        continue;
      }

      const products = await fetchTikiProductsViaBrowser(driver, topic, 22);
      if (products.length === 0) {
        console.log(`[${topicIndex}/${GIFT_CRAWL_TOPICS.length}] ⚠️ "${topic.query}": 0 sản phẩm`);
        await sleep(500);
        continue;
      }

      let insertedInTopic = 0;
      for (const p of products) {
        await conn.query(
          `
          INSERT INTO scraped_products (
            product_key, platform, name, price, currency, image, url,
            condition_name, category, location, search_keyword, score, reason,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            price = VALUES(price),
            image = VALUES(image),
            category = VALUES(category),
            search_keyword = VALUES(search_keyword),
            updated_at = NOW()
          `,
          [
            p.product_key,
            p.platform,
            p.name,
            p.price,
            p.currency,
            p.image,
            p.url,
            p.condition_name,
            p.category,
            p.location,
            p.search_keyword,
            p.score,
            p.reason,
          ]
        );
        insertedInTopic++;
      }

      totalSaved += insertedInTopic;
      console.log(
        `[${topicIndex}/${GIFT_CRAWL_TOPICS.length}] ✅ "${topic.query}" (${topic.category}) -> Đã lưu ${insertedInTopic} món quà`
      );
      await sleep(350);
    }

    const [finalCount] = await conn.query("SELECT COUNT(*) as c FROM scraped_products");
    const [catBreakdown] = await conn.query(
      "SELECT category, COUNT(*) as count FROM scraped_products GROUP BY category ORDER BY count DESC"
    );

    console.log("\n====================================================");
    console.log(`🎉 HOÀN TẤT! Đã xử lý thêm ${totalSaved} lượt sản phẩm.`);
    console.log(`📦 Tổng số quà tặng hợp lệ trong CSDL hiện tại: ${finalCount[0].c} sản phẩm`);
    console.log("====================================================");
    console.table(catBreakdown);
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch {}
    }
    conn.release();
  }
}

if (require.main === module) {
  runBulkCrawl()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Bulk crawl error:", err);
      process.exit(1);
    });
}

module.exports = { runBulkCrawl, GIFT_CRAWL_TOPICS };

