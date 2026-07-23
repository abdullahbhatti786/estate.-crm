const { v2: cloudinary } = require('cloudinary');
cloudinary.config({
  cloud_name: 's8jorntu',
  api_key: '854887693284532',
  api_secret: 'QrEKWW3pFou-SYyO8575gQfadWw'
});

const url = cloudinary.utils.url('estate-crm/documents/wgzsbaiqgudoj0pd8lcv.pdf', {
  resource_type: 'image',
  secure: true,
  sign_url: true,
  flags: 'attachment'
});
console.log(url);
