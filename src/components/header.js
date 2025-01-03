import {useState} from 'react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Menu, Container, Avatar, Button, Tooltip, MenuItem
} from '@mui/material';

import { useNavigate, useLocation } from 'react-router-dom';

const pages = [
  { name: 'Solicitud', route: '/solicitudes' },
  { name: 'Solicitud VIE', route: '/VIE' },
  { name: 'Seguimiento', route: '/seguimiento' },
  { name: 'Pendientes', route: '/pendientes' },
  { name: 'Rúbricas', route: '/rubricas' },
];

const settings = ['Profile', 'Account', 'Dashboard', 'Logout'];

function Header({ highlightedPage }) {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const navigate = useNavigate(); 
  const location = useLocation();

  const selectedPage = pages.find(page => page.route === location.pathname)?.name || ''; 

  
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenHome = () => {
    navigate('/'); 
  }; 

  const handlePageClick = (page) => {
    navigate(page.route);
  };



  const handleProfileClick = () => { //anadi esta funcion para que cuando se presione el perfil lo redireccione al mismo 
    navigate('/MiPerfil');  
    handleCloseUserMenu(); 
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#FFFFFF' }} elevation={0}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <IconButton onClick={handleOpenHome} color="inherit">
            <HomeRoundedIcon fontSize="large" sx={{ color: '#001B3D' }} />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <Box sx={{ display: 'flex' }}>
              {pages.map((page) => (
                <Button
                  key={page.name}
                  onClick={() => handlePageClick(page)}
                  sx={{ 
                    my: 2,
                    color: '#001B3D',
                    display: 'block',
                    textTransform: 'none',
                    fontSize: '14px', 
                    borderBottom: (selectedPage === page.name || highlightedPage === page.name) 
                      ? '2px solid #002855' 
                      : '2px solid #C0C0C0', 
                    borderRadius: 0, 
                   }}
                >
                  {page.name}
                </Button>
              ))}
            </Box>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 2 }}>
                <Avatar sx={{ backgroundColor: '#001B3D' }} />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem key={setting} onClick={setting === 'Profile' ? handleProfileClick : handleCloseUserMenu}>
                  <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header;