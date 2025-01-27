const axios = require('axios').default;
const cheerio = require('cheerio');
const baseUrl = "https://kbbi.kemdikbud.go.id";
module.exports = (query) => {
    if (!query) throw new Error('Masukkan kata!');
    return new Promise((resolve, reject) => {
        let dataError = {
            message: 'Kata tidak ditemukan!',
            error: true,
            data: {}
        };
        var _format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
        if (_format.test(query)) return resolve(dataError);
        axios.get(`${baseUrl}/entri/${query}`).then((response) => {
            if (response.status === 200) {
                const res = response.data;
                const $ = cheerio.load(res);
                let hasil = {};
                $('.container').filter(function(a, b) {
                    const t = $(this).find('h2').eq(0);
                    hasil.title = t.text().trim() == '' ? null : t.text().trim().replace(t.find("sup").text(), "");
                    const data = [];
                    const data2 = [];
                    $(this).find('li').each(function(a, b) {
                        const desk = $(this).text().replace(/\s+/g, ' ').trim();
                        let ignored = ["memberikan Anda hak berpartisipasi dalam pengayaan kosakata bahasa Indonesia dengan memberikan usulan kata/makna baru atau perbaikan pada KBBI", "Seputar Laman", "Daftar Baru", "Masuk", "menampilkan hasil pencarian dengan tambahan informasi yang lebih lengkap (misalnya, informasi etimologi)", "Cari", "memudahkan pencarian Anda melalui berbagai fitur yang hanya tersedia bagi pengguna terdaftar"];
                        if (desk == "" || ignored.find(x => x == desk) !== undefined) return;
                        let d = [];
                        let ks = {};
                        $(this).find("i").find("span").each(function(e, f) {
                            d.push({
                                nama: $(this).attr("title").split(":")[0].toLowerCase(),
                                v: $(this).attr("title").split(":")[1]?.trim().toLowerCase(),
                                abb: $(this).text(),
                            });
                        });
                        data.push({
                            desk: desk.replace(d.map(x => x.abb).join(" "), "").trim(),
                            kata: d
                        });
                        if (ks[d.map(x => x.abb).join("")] === undefined) {
                            data2.push({
                                desk: desk.replace(d.map(x => x.abb).join(" "), "").trim(),
                                kata: d
                            });
                        }
                        ks[d.map(x => x.abb).join("")] = true;
                    });
                    hasil = {
                        ...hasil,
                        arti: data,
                        arti2: data2
                    };
                });
                let finalHasil = {
                    message: 'Berhasil!',
                    error: false,
                    data: hasil
                };
                if (hasil.arti === null || hasil.title === null || hasil.arti.length === 0) return resolve(dataError);
                resolve(finalHasil);
            }
        }).catch(err => {
            console.log(err);
            // throw new Error(err);
        });
    });
};