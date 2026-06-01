import { IModelApp } from "@itwin/core-frontend";
import { 
    UiItemsProvider, ToolbarUsage, 
    ToolbarOrientation, CommonToolbarItem, 
    StageUsage, ToolbarItemUtilities, 
    StagePanelLocation,StagePanelSection,
    Widget,
        } from "@itwin/appui-react";
        
import { Visualization } from "../Visualization";
import { SmartDeviceListWidgetComponent } from "../widgets/SmartDeviceListWidgetComponent";


export class SmartDeviceUiItemsProvider implements UiItemsProvider {
  public readonly id = "SmartDeviceUiProvider";
  private _toggleWalls: boolean = false;

    /******************************************** */

    /******************************************** */
  public getToolbarItems(): ReadonlyArray<CommonToolbarItem> {
    const toolbarButtonItems: CommonToolbarItem[] = [];

    // Pass the properties as a single configuration object literal
    const toggleWallsButton: CommonToolbarItem = ToolbarItemUtilities.createActionItem({
      id: "ToggleWalls",
      itemPriority: 1000,
      icon: "Toggle Walls",
    //iconNode: "icon-element", // Handles iconSpec/iconNode syntax natively
      label: "Toggle Walls Tool",
      execute: () => {  
        this._toggleWalls = !this._toggleWalls;
        if (IModelApp.viewManager.selectedView) {
          Visualization.toggleHouseExterior(IModelApp.viewManager.selectedView, this._toggleWalls);
        }
      },
      // FIX: Inject layouts directly here so it isn't assigned to a read-only field later
      layouts: {
        standard: {
          usage: ToolbarUsage.ContentManipulation,
          orientation: ToolbarOrientation.Vertical
        }
      }
    });

    toolbarButtonItems.push(toggleWallsButton);
    return toolbarButtonItems;
  }

    /******************************************** */

    /******************************************** */
  public getWidgets(): ReadonlyArray<Widget> {
    const widgets: Widget[] = [];

    // Define the widget configuration
    const widget: Widget = {
      id: "smartDeviceListWidget",
      label: "Smart Devices",
      content: <SmartDeviceListWidgetComponent />,
      
      // FIX: Modern AppUI v4 location properties are explicitly defined here
      layouts: {
        standard: {
          location: StagePanelLocation.Right,
          section: StagePanelSection.Start
        }
      }
    };

    widgets.push(widget);
    return widgets;
  }

}
