{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.bun
  ];
  idx.extensions = [
    "csstools.postcss"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
  ];
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [ "bun" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0" ];
        manager = "web";
      };
    };
  };
}
