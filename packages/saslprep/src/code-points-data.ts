import { gunzipSync } from 'zlib';

export default gunzipSync(
  Buffer.from(
    'H4sIAAAAAAACA+3dTYgcaRkA4LemO9Mhxm0FITnE9Cwr4jHgwgZ22B6YywqCJ0HQg5CL4sGTuOjCtGSF4CkHEW856MlTQHD3EJnWkU0Owh5VxE3LHlYQdNxd2U6mU59UV/d09fw4M2EySSXPAzNdP1/9fX/99bzVNZEN4jisRDulVFnQmLxm1aXF9Id/2/xMxNJ4XZlg576yuYlGt9gupV6xoFf8jhu9YvulVrFlp5XSx+lfvYhORGPXvqIRWSxERKtIm8bKFd10WNfKDS5Fo9jJWrq2+M2IlW+8uHgl/+BsROfPF4v5L7148Ur68Sha6dqZpYiVVy8tvLCWXo80Sf/lS89dGX2wHGvpzoXVn75/YWH5wmqe8uika82ViJXTy83Ve2k5Urozm38wm4/ls6t5uT6yfsTSJ7J3T0VKt8c5ExEXI8aFkH729c3eT+7EC6ca8cVULZUiYacX0R5PNWNxlh9L1y90q5kyzrpyy+9WcvOV6URntqw7La9sNVstXyczWVaWYbaaTYqzOHpr7pyiNT3/YzKuT63Z/FqKZlFTiuXtFM2vVOtIq7jiyKJbWZaOWD0euz0yoV2Z7kY0xq2x0YhfzVpmM5px9nTEH7JZ0ot5u39p0ma75Z472/s/H+2yr2inYyuq7fMvJivH2rM72N/Z3lyL31F2b1ya1P0zn816k2KP6JU9UzseucdQH5YqVeH/lFajSN2udg+TLJ9rksNxlvV2lki19rXKI43TPLejFu4ov7k3nMbhyhfY3Xb37f8BAGCf0eMTOH5szf154KmnNgKcnLb+Fzi2AfXktbN7fJelwTAiO/W5uQ2KINXRYu+znqo/WTAdLadURHmy3qciazd3bra4T3w16/f7t7Ms9U5gfJu10955sx1r3vmhBAAAAAAAgId20J1iZbDowNvIjuH427Gr5l/eiC+8OplZON8sVjx/qr9y+Pj+YRItT+NqAM+kkZs3AAAAAID6yfx1FwCAI97/dCh1/ub6SA0AAAAAAAAAgNoT/wcAAAAAAACA+hP/BwAAAAAAAID6E/8HAAAAAAAAgPoT/wcAAAAAAACA+hP/BwAAAAAAAID6E/8HAAAAAAAAgPoT/wcAAAAAAACA+hP/BwAAAAAAAID6E/8HAAAAAAAAgPoT/wcAAAAAAACA+hutp5SiQpYAAAAAAAAAQO2MIpZiT804flnAE2fhwjOeAZXr76kOAAAAAAAA8FjNf4N/l0NE3U/vuVQskLpSd4/Yh2xu9xTu0tFeeNYsLI2f/VMdNxTzj6Je9E/+6pp6Nn3awW3A54goe4Bss6v+PGsjQGMAAAAAAOBp5XEgwH6e7J7rwEQHRb/XvAMAAAAAAAA8yzoDeQDwVGjIAgAAAAAAAACoPfF/AAAAAAAAAKg/8X8AAAAAAAAAqD/xfwAAAAAAAACoP/F/AAAAAAAAAKg/8X8AAAAAAAAAqD/xfwAAAAAAAACoP/F/AAAAAAAAAKg/8X8AAAAAAAAAqD/xfwAAAAAAAACoP/F/AAAAAAAAAKg/8X8AAAAAAAAAqL/GSkSkClkCAAAAAAAAALXTSAAAAAAAAABA3Y1kAQAAAAAAAADUX8RSXZ9dsHC9+M8Fg2Ex/em1lAZpEBGttcrVjZqLEa+k0XpKw9mG4zWx4ukPUMhkAQAAAAAAABzBqbSe3//rXOS9HxGdo4TqR2XkutCdBu+LaPZw/lBbO7cbHnh2C7N7AIo4evEznllqLqWUp/LnYOtpM2bnOH66wI1+9GO4sOuISwv/TOlumu56FDv3NZhc4mR9v7zYIrafr40j/Cccvj9Xns3t3mu99E7qxUv3bqS0/ouNH/08++RGemfQ+nsx/5uNXsQPGulynPvv3ZTW37zd+1ovrqaYpP/122X6Xpx779Z3zr/3YOPKW1lkaRDf31pPaf3j/msRsVGkL+d/f+/m4sJsPm1cfSsr16e8m9Ldj/KsnyIuR3nXw83Is3EhxLd/2V773ks3m/cj/THKUummdP9qKhIOImuOU0Xjwb3y+oqt735rpTetVbF9n8R4x9crRfO77TKqVOZpDclv5bfK18lMnk+q0K18UpxF/RrGXE0Zxtqx3tWSj+vxbL4XaasfKb0dRbtLW73JsfPGg177H+OmGKlfvS1msllt7JEJm9XOJqXR+Fkfo1H66uy5H1v3Xx5+uJmGLw9jro2u7Loj4PnuR6+f+e3d261+eazNhzrL7X83MohoHpS4PddV8ki1it61//pw1g7z6p1U/26Nm2llST57B5rUvuG0XqSU/rPd7jYrqWcbd+beJQ77BgPMDwn37/8BAGCf0eMTOH4cPlufv9VGgJOzqf8Fjm1APXkd7B7f5dF57GPMaWy/MTvjvNvtXj6h8W2+GXvnzXaseeeHEgAAAAAAAB7aQXeKlcGiadBoEOeLb2dtpGOL2MyOtf391a3P/zD96c3JzIP3t4oV797vrh8+vn+YRL5bBuj/AQAAAABqJvfHXQAAHkX82zfXAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACeAgkAAAAAAAAAqLuRLAAAAAAAAACA2hv9D1iu/VAYaAYA',
    'base64'
  )
);
